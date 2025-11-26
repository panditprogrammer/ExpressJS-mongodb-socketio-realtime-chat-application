import multer from 'multer';
import path from 'path';
import fs from "fs";

// Define storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var fileDestination = "./public/uploads";

    if (file.fieldname === "vCatImage") {
      fileDestination += "/vcategory"
    }

    //  Create directory if it does not exist
    if (!fs.existsSync(fileDestination)) {
      fs.mkdirSync(fileDestination, { recursive: true }); // Creates parent directories if needed
    }

    cb(null, fileDestination);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


export default upload 
