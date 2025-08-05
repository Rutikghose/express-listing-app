const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'listing_images',
        allowedFormats: ["png", "jpg", "jpeg"],
      
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
        
        public_id: (req, file) => {
            return 'listing_' + Date.now();
        }
    },
});

module.exports = {
    storage,
    cloudinary
};