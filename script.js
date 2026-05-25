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
    img.src = book.image
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

displayBooks()

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
        alert("読み取ったコード: " + isbn)

        codeReader.reset()

        await addBookByISBN(isbn)

        showPage(shelfPage)

      }
    }
  )
}


async function addBookByISBN(isbn) {
  const book = {
    isbn: isbn,
    image: "https://ndlsearch.ndl.go.jp/thumbnail/" + isbn + ".jpg"
  }

  books.push(book)

  saveBooks()
  displayBooks()
}

button.onclick = async () => {
  const isbn = input.value

  if (isbn === "") {
    alert("ISBNを入力してください")
    return
  }

  await addBookByISBN(isbn)

  input.value = ""

  showPage(shelfPage)
}