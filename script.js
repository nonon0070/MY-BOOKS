const shelfPage = document.getElementById("shelfPage")
const scanPage = document.getElementById("scanPage")

const goScanButton = document.getElementById("goScanButton")
const backButton = document.getElementById("backButton")
const scanButton = document.getElementById("scanButton")
const video = document.getElementById("video")
const list = document.getElementById("bookList")

let books = JSON.parse(localStorage.getItem("books")) || []

function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books))
}

function displayBooks() {
  list.innerHTML = ""

  books.forEach((book) => {
    const img = document.createElement("img")
    img.src = book.image
    img.className = "book-cover"

    list.appendChild(img)
  })
}

displayBooks()

goScanButton.onclick = () => {
  shelfPage.style.display = "none"
  scanPage.style.display = "block"
}

backButton.onclick = () => {
  scanPage.style.display = "none"
  shelfPage.style.display = "block"
}

async function addBookByISBN(isbn) {
  isbn = isbn.replace(/[^0-9X]/gi, "")

  if (!isbn.startsWith("978") && !isbn.startsWith("979")) {
    return
  }

  if (books.some((book) => book.isbn === isbn)) {
    return
  }

  const image =
    "https://books.google.com/books/content?vid=ISBN" +
    isbn +
    "&printsec=frontcover&img=1&zoom=1&source=gbs_api"

  const newBook = {
    isbn: isbn,
    image: image
  }

  books.push(newBook)
  saveBooks()
  displayBooks()
}

const codeReader = new ZXing.BrowserBarcodeReader()

scanButton.onclick = async () => {
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

        scanPage.style.display = "none"
        shelfPage.style.display = "block"
      }
    }
  )
}