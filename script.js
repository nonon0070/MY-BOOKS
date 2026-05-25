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
function displayBooks() {
  list.innerHTML = ""

  books.forEach((book, index) => {
    const img = document.createElement("img")

    img.src = book.image || "https://ndlsearch.ndl.go.jp/thumbnail/" + book.isbn
    img.onerror = () => {
  img.src = "https://ndlsearch.ndl.go.jp/thumbnail/" + book.isbn
}
    img.className = "book-cover"


    img.onclick = () => {
      const ok = confirm("この本を削除しますか？")

      if (!ok) {
        return
      }

      books.splice(index, 1)
      saveBooks()
      displayBooks()
    }

    list.appendChild(img)
  })
}

function showPage(page) {
  searchPage.style.display = "none"
  shelfPage.style.display = "none"
  statsPage.style.display = "none"
  settingsPage.style.display = "none"

  page.style.display = "block"
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

async function addBookByISBN(isbn) {
  isbn = isbn.trim()

  let title = "タイトル不明"
  let image = ""

  // まず openBD で本情報を取る
  const openbdResponse = await fetch("https://api.openbd.jp/v1/get?isbn=" + isbn)
  const openbdData = await openbdResponse.json()

  if (openbdData[0] !== null) {
    title = openbdData[0].summary.title

    if (openbdData[0].summary.cover) {
      image = openbdData[0].summary.cover
    }
  }

  // openBDで表紙が取れなかったら Google Books で探す
  if (image === "") {
    const googleResponse = await fetch("https://www.googleapis.com/books/v1/volumes?q=isbn:" + isbn)
    const googleData = await googleResponse.json()

    if (googleData.items && googleData.items.length > 0) {
      const bookInfo = googleData.items[0].volumeInfo

      if (bookInfo.title) {
        title = bookInfo.title
      }

      if (bookInfo.imageLinks && bookInfo.imageLinks.thumbnail) {
        image = bookInfo.imageLinks.thumbnail.replace("http://", "https://")
      }
    }
  }

  console.log("ISBN:", isbn)
  console.log("タイトル:", title)
  console.log("画像URL:", image)

  const book = {
    isbn: isbn,
    title: title,
    image: image
  }

  books.push(book)
  saveBooks()
  displayBooks()
}

 


button.onclick = async () => {
  const isbn = input.value.trim()

  if (isbn === "") {
    alert("ISBNを入力してください")
    return
  }

  await addBookByISBN(isbn)

  input.value = ""
  showPage(shelfPage)
}

const codeReader = new ZXing.BrowserBarcodeReader()

scanButton.onclick = async () => {
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
          const isbn = result.text

          

          codeReader.reset()

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