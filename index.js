const express = require("express");
const app = express();
const multer = require("multer");
const config = require("./config.json");
const GitHub = require("./ref/GitHub");
const path = require("path");
const fs = require("fs");
const git = new GitHub("1");

const upload = multer({ storage: multer.memoryStorage() });

app.set("view engine", "ejs");

app.get("/", async (req, res, next) => {
  return res.render("index.ejs", { req, res, next });
});

app.get("/dashboard", async (req, res, next) => {
  return res.render("dashboard.ejs", { req, res, next });
});

app.get("/token", async (req, res, next) => {
  return res.json({ content: git.getToken() });
});

app.post("/change", async (req, res, next) => {
  const { token } = req.query;
  try {
    git.setToken(atob(token));
    const bool = await git.isValidToken(atob(token));
    switch (bool) {
      case true:
        res.json({ content: "Token is valid! and saved", token: atob(token) });
        break;
      case false:
        res.status(503).json({ content: "Token is not valid" });
        break;
    }
  } catch (error) {
    return res
      .status(501)
      .json({ content: "Hemm, nice manipulation, pls use the ui" });
  }
});

app.post("/repo_check", async (req, res, next) => {
  const { token } = req.query;
  const check = await git.isRepo(token, config.REPO_NAME);
  switch (check) {
    case true:
      res.json({ content: "Repo exists!" });
      break;
    case false:
      res.status(503).json({ content: "The repo does'nt exist!" });
  }
});

app.post("/createLambda", async (req, res, next) => {
  const { token } = req.query;
  const check = await git.isRepo(token, config.REPO_NAME);
  if (check === true)
    return res.status(500).json({ content: "The lambdaRepo already exists!" });
  await git.createRepo(token, config.REPO_NAME).then(async (resX) => {
    if (resX === true) {
      return res.json({ content: "Repo created successfully!" });
    } else {
      return res.status(501).json({ content: "Something went wrong?" });
    }
  });
});

app.get("/decrypt", async (req, res, next) => {
  try {
    const { elink, secret } = req.query;    
    let link = atob(elink);
    let xsecret = atob(secret);
    const dataBuffer = await git.decryptAndDownload(link, xsecret);
    let filename = "decrypted-file";
    try {
        const urlParts = link.split('/');
        const originalEncName = urlParts[urlParts.length - 1];
        filename = originalEncName.replace('.enc', '').split('-').slice(1).join('-'); 
    } catch (e) {
        console.log("Could not parse filename, using default.");
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // Generic binary type
    
    return res.send(dataBuffer);

  } catch (error) {
    console.error(error);
    return res.status(400).json({ content: "Decryption failed or invalid link" });
  }
});

app.get("/get_avatar", async (req, res, next) => {
  const { token } = req.query;
  const imageSRC = await git.getAvatar(token);

  return res.json({ link: imageSRC });
});

app.post("/upload", upload.array("files", 10), async (req, res) => {
  const token = req.query.token;
  const secret = req.query.secret;
  if (!token) return res.status(400).send("Missing token");
  if (!secret)
    return res.status(400).json({ content: "You forgot to put secretkey!" });
  if (!req.files || req.files.length === 0)
    return res.status(400).send("No files uploaded");
  await git.uploadStuff(res, req, token, atob(secret));
});

app.get("/retrive", async (req, res, next) => {
  const token = req.query.token;
  const secret = req.query.secret;
  if (!token) return res.status(400).send("Missing token");
  if (!secret)
    return res.status(400).json({ content: "You forgot to put secretkey" });
  const data = await git.retriveStuff(req, res, token, secret);
  return res.json(data);
});

app.listen(config.PORT, () => {
  console.log("Server started =>" + config.PORT);
});

process.on("uncaughtException", async () => {
  return;
})

process.on("unhandledRejection", async () => {
  return;
})
process.on("uncaughtExceptionMonitor", async () => {
  return;
})
