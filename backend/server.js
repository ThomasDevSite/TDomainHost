const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs-extra');
const path = require('path');
const dns = require('dns').promises;

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const DATA_FILE = path.join(__dirname, 'sites.json');
const SITES_DIR = path.join(__dirname, 'sites');

// Garante pastas existentes
fs.ensureDirSync(SITES_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeJsonSync(DATA_FILE, {});

// Middleware para servir sites por hostname
app.use(async (req, res, next) => {
  const host = req.hostname.toLowerCase();
  const mapping = fs.readJsonSync(DATA_FILE);
  if (mapping[host]) {
    express.static(path.join(SITES_DIR, mapping[host]))(req, res, next);
  } else next();
});

// Recebe upload de ZIP com site estático
app.post('/api/create', upload.single('siteZip'), (req, res) => {
  const siteName = req.body.siteName.trim().toLowerCase();
  if (!siteName.match(/^[a-z0-9\-]+$/)) {
    return res.status(400).json({ error: 'Nome inválido' });
  }
  const sitePath = path.join(SITES_DIR, siteName);
  if (fs.existsSync(sitePath)) {
    return res.status(409).json({ error: 'Site já existe' });
  }
  // Extrai ZIP
  const zip = new AdmZip(req.file.buffer);
  zip.extractAllTo(sitePath, true);

  // Mapeia subdomínio
  const mapping = fs.readJsonSync(DATA_FILE);
  mapping[`${siteName}.seusite.site`] = siteName;
  fs.writeJsonSync(DATA_FILE, mapping);

  return res.json({
    url: `https://${siteName}.seusite.site`,
    instructions:
      'Aguarde alguns minutos para propagação DNS. Em seguida seu site estará no ar.'
  });
});

// Mapeia domínio customizado após checar DNS
app.post('/api/map-domain', express.json(), async (req, res) => {
  const { customDomain, siteName } = req.body;
  try {
    const records = await dns.resolve(customDomain, 'A');
    // Verifica se algum A record bate com seu servidor
    if (!records.includes('SEU_IP_AQUI')) {
      return res
        .status(400)
        .json({ error: 'DNS ainda não configurado para este domínio' });
    }

    const mapping = fs.readJsonSync(DATA_FILE);
    mapping[customDomain.toLowerCase()] = siteName;
    fs.writeJsonSync(DATA_FILE, mapping);
    return res.json({ success: true, url: `https://${customDomain}` });
  } catch (err) {
    return res.status(400).json({ error: 'Não foi possível resolver DNS' });
  }
});

// Página padrão do hoster
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Servir assets do frontend
app.use('/assets', express.static(path.join(__dirname, '../frontend')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando em http://localhost:${PORT}`)
);
