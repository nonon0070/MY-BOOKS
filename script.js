const input = document.getElementById("titleInput")
const button = document.getElementById("addButton")
const list = document.getElementById("bookList")
const scanButton = document.getElementById("scanButton")
const video = document.getElementById("video")

let books = JSON.parse(localStorage.getItem("books")) || []
let scanning = false

function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books))
}

function displayBooks() {
  list.innerHTML = ""

  books.forEach((book, index) => {
    const div = document.createElement("div")

    const img = document.createElement("img")
    img.src = book.image || "https://upload.wikimedia.org/wikipedia/commons/8/84/Example.svg"

    const title = document.createElement("p")
    title.textContent = book.title || "タイトル不明"

    const isbn = document.createElement("small")
    isbn.textContent = book.isbn || ""

    const del = document.createElement("button")
    del.textContent = "削除"

    del.onclick = () => {
      books.splice(index, 1)
      saveBooks()
      displayBooks()
    }

    div.appendChild(img)
    div.appendChild(title)
    div.appendChild(isbn)
    div.appendChild(del)

    list.appendChild(div)
  })
}

displayBooks()

async function addBookByISBN(isbn) {
  isbn = isbn.replace(/[^0-9X]/gi, "")

  if (!isbn.startsWith("978") && !isbn.startsWith("979")) {
    alert("ISBNではないバーコードかも: " + isbn)
    return
  }

  if (books.some(book => book.isbn === isbn)) {
    alert("この本はすでに登録済み")
    return
  }

  const res = await fetch("https://api.openbd.jp/v1/get?isbn=" + isbn)
  const data = await res.json()

  const info = data[0]

  if (!info) {
    alert("本情報が見つかりません: " + isbn)
    return
  }

  const summary = info.summary

 const newBook = {
  isbn: isbn,
  title: summary.title || isbn,
  image:
    summary.cover ||
    "https://books.google.com/books/content?vid=ISBN" +
      isbn +
      "&printsec=frontcover&img=1&zoom=1&source=gbs_api"

}
books.push(newBook)

saveBooks()

displayBooks()

button.onclick = async () => {
  const text = input.value.trim()

  if (text.startsWith("978") || text.startsWith("979")) {
    await addBookByISBN(text)
    input.value = ""
    return
  }

  alert("今はISBN検索を優先中")
}

const codeReader = new ZXing.BrowserBarcodeReader()

scanButton.onclick = async () => {
  scanning = true
  alert("バーコード開始")

  try {
    codeReader.reset()

    codeReader.decodeFromVideoDevice(
      null,
      video,
      async (result, error) => {
        if (result && scanning) {
          scanning = false

          const isbn = result.text
          input.value = isbn

          codeReader.reset()

          await addBookByISBN(isbn)
        }
      }
    )
  } catch (e) {
    scanning = false
    alert("バーコード起動失敗")
    console.log(e)
  }
 