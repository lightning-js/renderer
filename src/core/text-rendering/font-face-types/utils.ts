export function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        // On most devices like WebOS and Tizen, the file protocol returns 0 while http(s) protocol returns 200
        if (xhr.status === 0 || xhr.status === 200)
          resolve(JSON.parse(xhr.responseText));
        else reject(xhr.statusText);
      }
    };
    xhr.open('GET', url, true);
    xhr.send(null);
  });
}
