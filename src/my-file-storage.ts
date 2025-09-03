import multer from "multer";
import fs from 'fs';

export const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      fs.mkdirSync('uploads');
    } catch(e) {}

    cb(null, 'uploads');
  },
  filename(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.random() * 1E9}-${file.originalname}`
    cb(null, uniqueSuffix);
  }
});