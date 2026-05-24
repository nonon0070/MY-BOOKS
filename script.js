const input = document.getElementById("titleInput")
const button = document.getElementById("addButton")
const list = document.getElementById("bookList")

let books = JSON.parse(localStorage.getItem("books")) || []

function displayBooks() {

  list.innerHTML = ""

  books.forEach((book, index) => {

    const div = document.createElement("div")

    const img = document.createElement("img")
    img.src = book.image
    img.width = 100

    const title = document.createElement("p")
    title.textContent = book.title

    const del = document.createElement("button")
    del.textContent = "削除"

    del.onclick = () => {

      books.splice(index, 1)

      localStorage.setItem("books", JSON.stringify(books))

      displayBooks()
    }

    div.appendChild(img)
    div.appendChild(title)
    div.appendChild(del)

    list.appendChild(div)
  })
}

displayBooks()

button.onclick = async () => {

  const title = input.value

  const res = await fetch(
    "https://openlibrary.org/search.json?q=" +
    encodeURIComponent(title)
  )

  const data = await res.json()

  if (!data.docs || data.docs.length === 0) {
    alert("見つからない")
    return
  }

  const bookData = data.docs[0]

  const newBook = {
    title: bookData.title,

    image: bookData.cover_i
      ? `https://covers.openlibrary.org/b/id/${bookData.cover_i}-M.jpg`
      : "https://upload.wikimedia.org/wikipedia/commons/8/84/Example.svg"
  }

  books.push(newBook)

  localStorage.setItem("books", JSON.stringify(books))

  displayBooks()

  input.value = ""
}

const scanButton = document.getElementById("scanButton")
const video = document.getElementById("video")

const codeReader = new ZXing.BrowserBarcodeReader()

scanButton.onclick = async () => {

  alert("バーコード開始")

  try {

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    })

    video.srcObject = stream

    video.play()

    alert("カメラ成功")

  } catch (e) {

    alert("カメラ失敗")
    console.log(e)
  }
}