const searchPage = document.getElementById("searchPage")
const shelfPage = document.getElementById("shelfPage")
const statsPage = document.getElementById("statsPage")
const settingsPage = document.getElementById("settingsPage")

const navSearchButton = document.getElementById("navSearchButton")
const navShelfButton = document.getElementById("navShelfButton")
const navStatsButton = document.getElementById("navStatsButton")
const navSettingButton = document.getElementById("navSettingButton")

const scanButton = document.getElementById("scanButton")
const video = document.getElementById("video")

const input = document.getElementById("titleInput")
const button = document.getElementById("addButton")

const list = document.getElementById("bookList")

let books = JSON.parse(localStorage.getItem("books")) || []

function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books))
}

function showPage(page) {
  searchPage.style.display = "none"
  shelfPage.style.display = "none"
  statsPage.style.display = "none"
  settingsPage.style.display = "none"

  page.style.display = "block"
}

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

  // openBD系
  candidates.push("https://cover.openbd.jp/" + isbn + ".jpg")
  candidates.push("https://cover.openbd.jp/" + isbn)

  // 前のコードで成功していた Google Books の直接表紙URL
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
      const ok = confirm("この本を削除しますか？")

      if (!ok) {
        return
      }

      books.splice(index, 1)
      saveBooks()
      displayBooks()
    }

    list.appendChild(div)
  })
}

async function addBookByISBN(isbn) {
  isbn = isbn.replace(/[^0-9X]/gi, "")
  if (books.some((book) => book.isbn === isbn)) {
  alert("この本はすでに登録済みです")
  return
}

  if (isbn === "") {
    alert("ISBNを入力してください")
    return
  }

  let title = "タイトル不明"
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
    image: image
  }

  books.push(book)
  saveBooks()
  displayBooks()
}

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

button.onclick = async () => {
  const isbn = input.value.trim()

  await addBookByISBN(isbn)

  input.value = ""
  showPage(shelfPage)
}

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

displayBooks()