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
// 本棚表示エリアの取得
// =====================

const list = document.getElementById("bookList")
const backToShelfButton = document.getElementById("backToShelfButton")
const detailImage = document.getElementById("detailImage")
const detailAuthor = document.getElementById("detailAuthor")
const detailPublisher = document.getElementById("detailPublisher")
const detailPrice = document.getElementById("detailPrice")
const detailPages = document.getElementById("detailPages")
const detailRegisteredAt = document.getElementById("detailRegisteredAt")
const detailDeleteButton = document.getElementById("detailDeleteButton")


// =====================
// 本棚データ
// =====================

// localStorageに保存されている本棚データを読み込む
// なければ空の配列 [] にする
let books = JSON.parse(localStorage.getItem("books")) || []

// 本棚データをlocalStorageに保存する
function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books))
}


// =====================
// ページ切り替え
// =====================

// すべてのページを一度非表示にして、指定したページだけ表示する
function showPage(page) {
  searchPage.style.display = "none"
  shelfPage.style.display = "none"
  statsPage.style.display = "none"
  settingsPage.style.display = "none"
  detailPage.style.display = "none"

  page.style.display = "block"
}
s
// =====================
// 表紙画像URLの補助関数
// =====================

// httpの画像URLをhttpsに直す
function normalizeImageUrl(url) {
  if (!url) {
    return ""
  }

  return url.replace("http://", "https://")
}

// その画像URLが実際に読み込めるか確認する
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

// openBDのデータの中から画像URLっぽいものを集める
function collectUrlsFromOpenBD(bookData) {
  function getPriceFromOpenBD(bookData) {
  const prices = bookData?.onix?.ProductSupply?.SupplyDetail?.Price

  if (Array.isArray(prices) && prices[0] && prices[0].PriceAmount) {
    return Number(prices[0].PriceAmount)
  }

  return ""
}

function getPageCountFromOpenBD(bookData) {
  const extents = bookData?.onix?.DescriptiveDetail?.Extent

  if (Array.isArray(extents)) {
    const pageData = extents.find((extent) => {
      return extent.ExtentType === "11" || extent.ExtentUnit === "03"
    })

    if (pageData && pageData.ExtentValue) {
      return Number(pageData.ExtentValue)
    }
  }

  return ""
}
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

// 複数の候補から、実際に表示できる表紙画像URLを探す
async function findWorkingCover(isbn, openbdUrls) {
  console.log("表紙探し開始:", isbn)

  const candidates = []

  // openBDの中に入っていた画像URL候補
  openbdUrls.forEach((url) => {
    if (url) {
      candidates.push(url)
    }
  })

  // openBD系の表紙URL
  candidates.push("https://cover.openbd.jp/" + isbn + ".jpg")
  candidates.push("https://cover.openbd.jp/" + isbn)

  // 前に成功していたGoogle Booksの直接表紙URL
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

  // Open Library
  candidates.push("https://covers.openlibrary.org/b/isbn/" + isbn + "-L.jpg?default=false")
  candidates.push("https://covers.openlibrary.org/b/isbn/" + isbn + "-M.jpg?default=false")

  // NDL
  candidates.push("https://ndlsearch.ndl.go.jp/thumbnail/" + isbn)

  // 同じURLが重複していたら1つにまとめる
  const uniqueCandidates = [...new Set(candidates)]

  // 実際に読み込める画像URLを探す
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
// 本棚表示
// =====================

let selectedBookIndex = null

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

function showBookDetail(book, index) {
  selectedBookIndex = index

  detailImage.src = book.image
  detailAuthor.textContent = "著者 / イラストレーター：" + (book.author || "不明")
  detailPublisher.textContent = "出版社：" + (book.publisher || "不明")
  detailPrice.textContent = "値段：" + (book.price ? book.price + "円" : "不明")
  detailPages.textContent = "ページ数：" + (book.pageCount ? book.pageCount + "ページ" : "不明")
  detailRegisteredAt.textContent = "登録日：" + formatDate(book.registeredAt)

  showPage(detailPage)
}


// books配列の中身を本棚ページに表示する
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

    // 今は本をクリックすると削除確認を出す
    // 後でここを「詳細ページを開く」に変更する予定
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
  // ISBN以外の余計な文字を消す
  isbn = isbn.replace(/[^0-9X]/gi, "")

  // 空なら追加しない
  if (isbn === "") {
    alert("ISBNを入力してください")
    return
  }

  // 同じISBNの本がすでにあるなら追加しない
  if (books.some((book) => book.isbn === isbn)) {
    alert("この本はすでに登録済みです")
    return
  }

  let title = "タイトル不明"
let author = "不明"
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

if (bookData.summary && bookData.summary.author) {
  author = bookData.summary.author
}

if (bookData.summary && bookData.summary.publisher) {
  publisher = bookData.summary.publisher
}

price = getPriceFromOpenBD(bookData)
pageCount = getPageCountFromOpenBD(bookData)

openbdUrls = collectUrlsFromOpenBD(bookData)

      openbdUrls = collectUrlsFromOpenBD(bookData)
    }
  } catch (error) {
    console.log("openBD取得エラー:", error)
  }

  console.log("openBD内URL:", openbdUrls)

  const image = await findWorkingCover(isbn, openbdUrls)

  console.log("ISBN:", isbn)
  console.log("タイトル:", title)
  console.log("最終画像URL:", image)

  const book = {
  isbn: isbn,
  title: title,
  image: image,
  author: author,
  publisher: publisher,
  price: price,
  pageCount: pageCount,
  registeredAt: new Date().toISOString()
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

detailDeleteButton.onclick = () => {
  if (selectedBookIndex === null) {
    return
  }

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

// ページを開いたときに保存済みの本棚を表示する
displayBooks()