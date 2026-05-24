const shelfPage = document.getElementById("shelfPage")
const scanPage = document.getElementById("scanPage")

const goScanButton = document.getElementById("goScanButton")
const backButton = document.getElementById("backButton")
const scanButton = document.getElementById("scanButton")
const video = document.getElementById("video")

goScanButton.onclick = () => {
  shelfPage.style.display = "none"
  scanPage.style.display = "block"
}

backButton.onclick = () => {
  scanPage.style.display = "none"
  shelfPage.style.display = "block"
}

scanButton.onclick = async () => {
  alert("カメラ起動テスト")

  const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "environment"
  }
})

  video.srcObject = stream
  video.play()
}