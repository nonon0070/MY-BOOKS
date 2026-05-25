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
    const div = document.createElement("div")
    div.className = "book-item"

    if (book.image) {
      const img = document.createElement("img")
      img.src = book.image
      img.className = "book-cover"
      div.appendChild(img)
    } else {
      const noImage = document.createElement("div")
      noImage.className = "no-cover"
      noImage.textContent = "表紙なし"
      div.appendChild(noImage)
    }

    const p = document.createElement("p")
    p.textContent = book.title || book.isbn
    p.className = "book-isbn"

    div.appendChild(p)

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
  const response = await fetch("https://api.openbd.jp/v1/get?isbn=" + isbn)
  const data = await response.json()

  let image = ""
  let title = "タイトル不明"

  if (data[0] !== null) {
    title = data[0].summary.title
    image = data[0].summary.cover
  }

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

          alert("読み取ったコード: " + isbn)

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