async function postForm(form, url) {
  const data = new FormData(form);
  const opts = url.endsWith('create')
    ? { method: 'POST', body: data }
    : {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: data.get('siteName'),
          customDomain: data.get('customDomain')
        })
      };

  const res = await fetch(url, opts);
  const json = await res.json();
  return JSON.stringify(json, null, 2);
}

document.getElementById('createForm').onsubmit = async e => {
  e.preventDefault();
  const out = await postForm(e.target, '/api/create');
  document.getElementById('createResult').textContent = out;
};

document.getElementById('mapForm').onsubmit = async e => {
  e.preventDefault();
  const out = await postForm(e.target, '/api/map-domain');
  document.getElementById('mapResult').textContent = out;
};
