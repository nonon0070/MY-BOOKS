// =====================
// ページ要素の取得
// =====================

const searchPage = document.getElementById("searchPage")
const shelfPage = document.getElementById("shelfPage")
const statsPage = document.getElementById("statsPage")
const settingsPage = document.getElementById("settingsPage")
const detailPage = document.getElementById("detailPage")


// =====================
// 下ナビボタンの取得
// =====================

const navSearchButton = document.getElementById("navSearchButton")
const navShelfButton = document.getElementById("navShelfButton")
const navStatsButton = document.getElementById("navStatsButton")
const navSettingButton = document.getElementById("navSettingButton")


// =====================
// 本検索・バーコード関連の要素取得
// =====================

const scanButton = document.getElementById("scanButton")
const video = document.getElementById("video")

const input = document.getElementById("titleInput")
const button = document.getElementById("addButton")


// =====================
// 本棚・詳細ページ関連の要素取得
// =====================

const list = document.getElementById("bookList")
const backToShelfButton = document.getElementById("backToShelfButton")
const detailContent = document.getElementById("detailContent")


// =====================
// 本棚データ
// =====================

let books = JSON.parse(localStorage.getItem("books")) || []
let selectedBookIndex = null

function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books))
}


// =====================
// ページ切り替え
// =====================

function showPage(page) {
  searchPage.style.display = "none"
  shelfPage.style.display = "none"
  statsPage.style.display = "none"
  settingsPage.style.display = "none"
  detailPage.style.display = "none"

  page.style.display = "block"
}


// =====================
// 表紙画像URLの補助関数
// =====================

function normalizeImageUrl(url) {
  if (!url) {
    return ""
  }

  return url.replace("http://", "https://")
}

function isImageLoadable(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false)
      return
    }

    const img = new Image()

    img.onload = () => {
      resolve(true)
    }

    img.onerror = () => {
      resolve(false)
    }

    img.src = url
  })
}

function collectUrlsFromOpenBD(bookData) {
  const urls = []
  const text = JSON.stringify(bookData)
  const matches = text.match(/https?:\/\/[^"]+/g) || []

  matches.forEach((url) => {
    urls.push(normalizeImageUrl(url))
  })

  if (bookData.summary && bookData.summary.cover) {
    urls.unshift(normalizeImageUrl(bookData.summary.cover))
  }

  return urls
}

async function findWorkingCover(isbn, openbdUrls) {
  console.log("表紙探し開始:", isbn)

  const candidates = []

  openbdUrls.forEach((url) => {
    if (url) {
      candidates.push(url)
    }
  })

  candidates.push("https://cover.openbd.jp/" + isbn + ".jpg")
  candidates.push("https://cover.openbd.jp/" + isbn)

  candidates.push(
    "https://books.google.com/books/content?vid=ISBN" +
      isbn +
      "&printsec=frontcover&img=1&zoom=1&source=gbs_api"
  )

  candidates.push(
    "https://books.google.com/books/content?vid=ISBN" +
      isbn +
      "&printsec=frontcover&img=1&zoom=0&source=gbs_api"
  )

  candidates.push(
    "https://books.google.com/books/content?vid=ISBN" +
      isbn +
      "&printsec=frontcover&img=1&zoom=2&source=gbs_api"
  )

  candidates.push("https://covers.openlibrary.org/b/isbn/" + isbn + "-L.jpg?default=false")
  candidates.push("https://covers.openlibrary.org/b/isbn/" + isbn + "-M.jpg?default=false")

  candidates.push("https://ndlsearch.ndl.go.jp/thumbnail/" + isbn)

  const uniqueCandidates = [...new Set(candidates)]

  for (const url of uniqueCandidates) {
    const ok = await isImageLoadable(url)

    console.log("表紙候補:", url, ok)

    if (ok) {
      return url
    }
  }

  return ""
}

// =====================
// openBDから追加情報を取る関数
// =====================

function getTextValue(value) {
  if (!value) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number") {
    return String(value)
  }

  if (typeof value === "object" && value.content) {
    return value.content
  }

  return ""
}

function cleanName(name) {
  if (!name) {
    return ""
  }

  return String(name)
    .replace(/\s+/g, "")
    .replace(/，/g, ",")
    .trim()
}

function splitCreatorText(text) {
  if (!text) {
    return []
  }

  return String(text)
    .split(/[、／\/]/)
    .map((name) => cleanName(name))
    .filter((name) => name !== "")
}

function splitCommaCreatorText(text) {
  if (!text) {
    return []
  }

  return String(text)
    .split(/[,，]/)
    .map((name) => cleanName(name))
    .filter((name) => name !== "")
}

function getContributorRoleList(contributor) {
  const role = contributor.ContributorRole

  if (Array.isArray(role)) {
    return role.map((item) => getTextValue(item))
  }

  return [getTextValue(role)]
}

function getContributorName(contributor) {
  return cleanName(
    getTextValue(contributor.PersonName) ||
      getTextValue(contributor.PersonNameInverted) ||
      getTextValue(contributor.CorporateName)
  )
}

function getContributors(bookData) {
  const contributors = bookData?.onix?.DescriptiveDetail?.Contributor

  if (!Array.isArray(contributors)) {
    return []
  }

  return contributors
    .map((contributor) => {
      return {
        name: getContributorName(contributor),
        roles: getContributorRoleList(contributor)
      }
    })
    .filter((contributor) => contributor.name !== "")
}

function getContributorNamesByRole(bookData, roleCodes) {
  const contributors = getContributors(bookData)

  const names = contributors
    .filter((contributor) => {
      return contributor.roles.some((role) => roleCodes.includes(role))
    })
    .map((contributor) => contributor.name)

  return [...new Set(names)]
}

function getLabelFromOpenBD(bookData) {
  const collection = bookData?.onix?.DescriptiveDetail?.Collection

  if (Array.isArray(collection)) {
    const titleElement = collection[0]?.TitleDetail?.TitleElement

    if (Array.isArray(titleElement)) {
      const titleText = getTextValue(titleElement[0]?.TitleText)

      if (titleText) {
        return titleText
      }
    }
  }

  if (bookData.summary && bookData.summary.series) {
    return bookData.summary.series
  }

  return "不明"
}

function looksLikeLightNovel(bookData) {
  const label = getLabelFromOpenBD(bookData)
  const title = bookData?.summary?.title || ""

  return (
    label.includes("文庫") ||
    label.includes("ノベル") ||
    label.includes("ファンタジア") ||
    label.includes("ダッシュエックス") ||
    label.includes("電撃") ||
    title.includes("ラノベ")
  )
}

function getAuthorFromOpenBD(bookData) {
  const authorNames = getContributorNamesByRole(bookData, ["A01"])
  const illustratorNames = getContributorNamesByRole(bookData, ["A12", "A13", "A36", "B06"])

  if (authorNames.length >= 2 && illustratorNames.length === 0 && looksLikeLightNovel(bookData)) {
    return authorNames[0]
  }

  if (authorNames.length >= 1) {
    return authorNames.join("、")
  }

  const summaryAuthor = bookData?.summary?.author || ""
  const slashParts = splitCreatorText(summaryAuthor)

  if (slashParts.length >= 2) {
    return slashParts[0]
  }

  const commaParts = splitCommaCreatorText(summaryAuthor)

  if (commaParts.length >= 2 && looksLikeLightNovel(bookData)) {
    return commaParts[0]
  }

  if (summaryAuthor) {
    return cleanName(summaryAuthor).replace(/,/g, "")
  }

  return "不明"
}

function getIllustratorFromOpenBD(bookData) {
  const illustratorNames = getContributorNamesByRole(bookData, ["A12", "A13", "A36", "B06"])

  if (illustratorNames.length >= 1) {
    return illustratorNames.join("、")
  }

  const authorNames = getContributorNamesByRole(bookData, ["A01"])

  if (authorNames.length >= 2 && looksLikeLightNovel(bookData)) {
    return authorNames.slice(1).join("、")
  }

  const summaryAuthor = bookData?.summary?.author || ""
  const slashParts = splitCreatorText(summaryAuthor)

  if (slashParts.length >= 2) {
    return slashParts.slice(1).join("、")
  }

  const commaParts = splitCommaCreatorText(summaryAuthor)

  if (commaParts.length >= 2 && looksLikeLightNovel(bookData)) {
    return commaParts.slice(1).join("、")
  }

  return "不明"
}

function getPriceFromOpenBD(bookData) {
  const prices = bookData?.onix?.ProductSupply?.SupplyDetail?.Price

  if (Array.isArray(prices)) {
    const priceData = prices.find((price) => price.PriceAmount)

    if (priceData && priceData.PriceAmount) {
      return Number(getTextValue(priceData.PriceAmount))
    }
  }

  return ""
}

function getPageCountFromOpenBD(bookData) {
  const extents = bookData?.onix?.DescriptiveDetail?.Extent

  if (Array.isArray(extents)) {
    const pageData = extents.find((extent) => {
      const type = getTextValue(extent.ExtentType)
      const unit = getTextValue(extent.ExtentUnit)
      const value = Number(getTextValue(extent.ExtentValue))

      return value > 20 && value < 3000 && (type === "00" || type === "11" || unit === "03")
    })

    if (pageData && pageData.ExtentValue) {
      return Number(getTextValue(pageData.ExtentValue))
    }
  }

  return ""
}

function normalizePublisherName(publisherName) {
  if (!publisherName) {
    return "不明"
  }

  return publisherName
}

function getPublisherFromOpenBD(bookData) {
  const publishers = bookData?.onix?.PublishingDetail?.Publisher

  if (Array.isArray(publishers)) {
    const mainPublisher = publishers.find((publisher) => {
      return getTextValue(publisher.PublisherRole) === "01"
    })

    if (mainPublisher && mainPublisher.PublisherName) {
      return normalizePublisherName(getTextValue(mainPublisher.PublisherName))
    }

    if (publishers[0] && publishers[0].PublisherName) {
      return normalizePublisherName(getTextValue(publishers[0].PublisherName))
    }
  }

  if (bookData.summary && bookData.summary.publisher) {
    return normalizePublisherName(bookData.summary.publisher)
  }

  return "不明"
}

async function getPageCountFromGoogleBooks(isbn) {
  try {
    const response = await fetch("https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbn)
    const data = await response.json()

    if (
      data.items &&
      data.items[0] &&
      data.items[0].volumeInfo &&
      data.items[0].volumeInfo.pageCount
    ) {
      return Number(data.items[0].volumeInfo.pageCount)
    }
  } catch (error) {
    console.log("Google Booksページ数取得エラー:", error)
  }

  return ""
}

// =====================
// 詳細ページ
// =====================
function formatDate(dateText) {
  if (!dateText) {
    return "不明"
  }

  const date = new Date(dateText)

  if (Number.isNaN(date.getTime())) {
    return "不明"
  }

  return date.toLocaleDateString("ja-JP")
}

function formatDateForInput(dateText) {
  if (!dateText) {
    return ""
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    return dateText
  }

  const date = new Date(dateText)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return year + "-" + month + "-" + day
}

function getTodayDateValue() {
  const date = new Date()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return year + "-" + month + "-" + day
}

function showBookDetail(book, index) {
  selectedBookIndex = index

  detailContent.innerHTML = `
    <div id="bookDetailBox">
      <img id="detailImage" src="${book.image}">

      <div id="detailInfo">
        <p>著者：${book.author || "不明"}</p>
        <p>イラストレーター：${book.illustrator || "不明"}</p>
        <p>レーベル：${book.label || "不明"}</p>
        <p>出版社：${book.publisher || "不明"}</p>
        <p>値段：${book.price ? book.price + "円" : "不明"}</p>
        <p>ページ数：${book.pageCount ? book.pageCount + "ページ" : "不明"}</p>
      </div>
    </div>

    <div id="detailRegisteredAtBox">
  <label for="detailRegisteredAtInput">登録日：</label>
  <input
    id="detailRegisteredAtInput"
    type="date"
    value="${formatDateForInput(book.registeredAt)}"
  >
</div>

    <button id="detailDeleteButton">この本を削除</button>
  `

  const detailDeleteButton = document.getElementById("detailDeleteButton")
const detailRegisteredAtInput = document.getElementById("detailRegisteredAtInput")

detailRegisteredAtInput.onchange = () => {
  if (selectedBookIndex === null) {
    return
  }

  books[selectedBookIndex].registeredAt = detailRegisteredAtInput.value
  saveBooks()
}

  detailDeleteButton.onclick = () => {
    const ok = confirm("この本を削除しますか？")

    if (!ok) {
      return
    }

    books.splice(selectedBookIndex, 1)
    saveBooks()
    displayBooks()

    selectedBookIndex = null
    showPage(shelfPage)
  }

  showPage(detailPage)
}


// =====================
// 本棚表示
// =====================

function displayBooks() {
  list.innerHTML = ""

  books.forEach((book, index) => {
    const div = document.createElement("div")
    div.className = "book-item"

    if (book.image) {
      const img = document.createElement("img")
      img.src = book.image
      img.className = "book-cover"

      img.onerror = () => {
        const noCover = document.createElement("div")
        noCover.className = "book-cover"
        noCover.textContent = "表紙なし"

        if (div.contains(img)) {
          div.replaceChild(noCover, img)
        }
      }

      div.appendChild(img)
    } else {
      const noCover = document.createElement("div")
      noCover.className = "book-cover"
      noCover.textContent = "表紙なし"
      div.appendChild(noCover)
    }

    div.onclick = () => {
      showBookDetail(book, index)
    }

    list.appendChild(div)
  })
}


// =====================
// ISBNから本を追加
// =====================

async function addBookByISBN(isbn) {
  isbn = isbn.replace(/[^0-9X]/gi, "")

  if (isbn === "") {
    alert("ISBNを入力してください")
    return
  }

  if (books.some((book) => book.isbn === isbn)) {
    alert("この本はすでに登録済みです")
    return
  }

  let title = "タイトル不明"
  let author = "不明"
  let illustrator = "不明"
  let label = "不明"
  let publisher = "不明"
  let price = ""
  let pageCount = ""
  let openbdUrls = []

    try {
    const response = await fetch("https://api.openbd.jp/v1/get?isbn=" + isbn)
    const data = await response.json()

    console.log("openBD全部:", data)

    if (data[0] !== null) {
      const bookData = data[0]

      if (bookData.summary && bookData.summary.title) {
        title = bookData.summary.title
      }

      author = getAuthorFromOpenBD(bookData)
      illustrator = getIllustratorFromOpenBD(bookData)
      label = getLabelFromOpenBD(bookData)
      publisher = getPublisherFromOpenBD(bookData)
      price = getPriceFromOpenBD(bookData)
      pageCount = getPageCountFromOpenBD(bookData)

      openbdUrls = collectUrlsFromOpenBD(bookData)
    }
  } catch (error) {
    console.log("openBD取得エラー:", error)
  }

  console.log("openBD内URL:", openbdUrls)

  if (!pageCount) {
  pageCount = await getPageCountFromGoogleBooks(isbn)
}


  const image = await findWorkingCover(isbn, openbdUrls)

  console.log("ISBN:", isbn)
  console.log("タイトル:", title)
  console.log("最終画像URL:", image)

  const book = {
    isbn: isbn,
    title: title,
    image: image,
    author: author,
    illustrator: illustrator,
    label: label,
    publisher: publisher,
    price: price,
    pageCount: pageCount,
    registeredAt: getTodayDateValue()
   
  }

  books.push(book)
  saveBooks()
  displayBooks()
}


// =====================
// 下ナビのクリック処理
// =====================

navSearchButton.onclick = () => {
  showPage(searchPage)
}

navShelfButton.onclick = () => {
  showPage(shelfPage)
}

navStatsButton.onclick = () => {
  showPage(statsPage)
}

navSettingButton.onclick = () => {
  showPage(settingsPage)
}

backToShelfButton.onclick = () => {
  showPage(shelfPage)
}


// =====================
// ISBN入力ボタンの処理
// =====================

button.onclick = async () => {
  const isbn = input.value.trim()

  await addBookByISBN(isbn)

  input.value = ""
  showPage(shelfPage)
}


// =====================
// バーコード読み取り
// =====================

let codeReader = null

if (window.ZXing) {
  codeReader = new ZXing.BrowserBarcodeReader()
}

scanButton.onclick = async () => {
  if (!codeReader) {
    alert("バーコード読み取りライブラリを読み込めませんでした")
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      }
    })

    video.srcObject = stream
    video.play()

    codeReader.decodeFromVideoDevice(
      null,
      video,
      async (result, error) => {
        if (result) {
          const isbn = result.text.trim()

          codeReader.reset()

          if (video.srcObject) {
            const tracks = video.srcObject.getTracks()
            tracks.forEach((track) => track.stop())
            video.srcObject = null
          }

          await addBookByISBN(isbn)

          showPage(shelfPage)
        }
      }
    )
  } catch (error) {
    alert("カメラを起動できませんでした")
    console.log(error)
  }
}


// =====================
// 初期表示
// =====================

displayBooks() 