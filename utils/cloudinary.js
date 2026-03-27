/*import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config({});

cloudinary.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
});

export const uploadMedia = async (file) => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
    });
    return uploadResponse;
  } catch (error) {
    console.log(error);
  }
};
export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log(error);
  }
};

export const deleteVideoFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    console.log(error);
  }
};
*/

//upload in express+multer vs in nextjs (mediamorphai) : https://gemini.google.com/share/878ede164d39

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs"; // Import the File System module

dotenv.config();

// 1. Validate environment variables early
const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } = process.env;

if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
  throw new Error("Cloudinary credentials are missing in environment variables.");
}

cloudinary.config({
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  cloud_name: CLOUDINARY_CLOUD_NAME,
});

/**
 * Uploads a file (image, video, raw) to Cloudinary
 */
/*
export const uploadMedia = async (file) => {
  try {
    return await cloudinary.uploader.upload(file, {
      resource_type: "auto",
    });
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("Failed to upload media to Cloudinary.");
  }
};
*/

/**
 * Uploads a file to Cloudinary and deletes it from the local server
 */
export const uploadMedia = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // File has been uploaded successfully
    console.log("File uploaded to Cloudinary:", response.url);
    
    // Remove the file from the local 'uploads' folder
    fs.unlinkSync(localFilePath); 

    return response;
  } catch (error) {
    // Even if the upload fails, we should remove the local file to keep the server clean
    if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    }
    
    console.error("Cloudinary Upload Error:", error);
    throw new Error("Failed to upload media to Cloudinary.");
  }
};


/**
 * Generic delete function to reduce redundancy
 */
const deleteResource = async (publicId, resourceType = "image") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error(`Cloudinary Delete Error (${resourceType}):`, error);
    throw new Error(`Failed to delete ${resourceType} from Cloudinary.`);
  }
};

export const deleteMediaFromCloudinary = (publicId) => {
    deleteResource(publicId, "image");
}

export const deleteVideoFromCloudinary = (publicId) => {
    deleteResource(publicId, "video");
}