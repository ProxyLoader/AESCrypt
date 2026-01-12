const axios = require("axios");
const config = require("../config.json");
const multer = require("multer");
const AES = require("./AES");

class GitHub {
  constructor(token) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }
  setToken(newToken) {
    this.token = newToken;
  }

  async isValidToken() {
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({ auth: this.getToken() });
    try {
      const { data } = await octokit.request("GET /user");
      console.log("Token is valid for user:", data.login);
      return true;
    } catch (error) {
      return false;
    }
  }

  async isRepo(token, repoName) {
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({ auth: token });

    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      const owner = user.login;

      await octokit.rest.repos.get({
        owner,
        repo: repoName,
      });

      console.log(`Repo "${owner}/${repoName}" exists.`);
      return true;
    } catch (err) {
      if (err.status === 404) {
        console.log(`Repo "${repoName}" does NOT exist for this user.`);
        return false;
      } else {
        console.error("Error checking repo:", err.message);
        return false;
      }
    }
  }

  async createRepo(token, repoName) {
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({ auth: token });

    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      const owner = user.login;

      await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        private: false,
      });
      console.log(`Repo "${owner}/${repoName}" created!`);
      return true;
    } catch (err) {
      console.error("Error creating repo:", err.message);
      return false;
    }
  }

  async uploadStuff(res, req, token, secretKey) {
    if (!secretKey)
      return res.status(400).send("Missing secret key for encryption");

    try {
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: token });

      const { data: user } = await octokit.rest.users.getAuthenticated();
      const username = user.login;
      const aes = new AES(secretKey);

      for (const file of req.files) {
        const encryptedBuffer = aes.encryptFile(file.buffer);

        const contentBase64 = encryptedBuffer.toString("base64");

        const pathInRepo = `uploads/${Date.now()}-${file.originalname}.enc`;
        await octokit.rest.repos.createOrUpdateFileContents({
          owner: username,
          repo: config.REPO_NAME,
          path: pathInRepo,
          message: `Upload encrypted file ${file.originalname}`,
          content: contentBase64,
        });

        console.log(
          `Uploaded encrypted: ${file.originalname} -> ${pathInRepo}`
        );
      }

      res.send({
        message: "Files encrypted and uploaded to GitHub",
        user: username,
        files: req.files.map((f) => f.originalname),
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to encrypt/upload files to GitHub");
    }
  }

  async retriveStuff(req, res, token, secretKey){
      try {
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({ auth: token });

    const { data: user } = await octokit.rest.users.getAuthenticated();
    const username = user.login;

    const listResponse = await octokit.rest.repos.getContent({
      owner: username,
      repo: config.REPO_NAME,
      path: "uploads",
    });

    const files = [];

    for (const file of listResponse.data) {
      const fileResponse = await octokit.rest.repos.getContent({
        owner: username,
        repo: config.REPO_NAME,
        path: file.path,
      });

      const encryptedBuffer = fileResponse.data.download_url;

      files.push({
        name: file.name,
        path: file.path,
        downloadUrl: encryptedBuffer,
      });
    }
    return files;
  } catch (err) {
    console.error(err);
    throw new Error("Failed to retrieve files from GitHub");
  }
  }

  async decryptAndDownload(githubLink, secretKey) {
    try {
      const response = await axios.get(githubLink, {
        responseType: "arraybuffer",
      });
      const encryptedBuffer = Buffer.from(response.data);
      const aes = new AES(secretKey);
      const decryptedBuffer = aes.decryptFile(encryptedBuffer);
      return decryptedBuffer;
    } catch (error) {
      console.error("Error decrypting file:", error.message);
      throw error;
    }
  }

  async getAvatar(token) {
    const { Octokit } = await import("octokit");
    const octokit = new Octokit({ auth: token });
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      const owner = user.avatar_url;
      return owner;
    } catch (error) {
      return "no";
    }
  }
}
module.exports = GitHub;