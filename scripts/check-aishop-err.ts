async function checkError() {
  const res = await fetch("http://localhost:3000/ai-shop");
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("HTML snippet:", text.slice(0, 500));
}
checkError();
