import Razorpay from "razorpay";
import crypto from "crypto";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";


import Razorpay from "razorpay";
import crypto from "crypto";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    //  Check if course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    //  Prevent duplicate purchase if already completed
    const existingPurchase = await CoursePurchase.findOne({
      user: userId,
      course: courseId,
      status: "completed",
    });
    if (existingPurchase) {
      return res.status(400).json({ message: "You already own this course!" });
    }

    //  Razorpay Options
    const options = {
      amount: Math.round(course.price * 100), // Ensuring integer for paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { courseId, userId },
    };

    const order = await razorpay.orders.create(options);

    //  Upsert Purchase Record (Find pending or create new)
    // This prevents creating 10 records if a user clicks 'Buy' 10 times.
    await CoursePurchase.findOneAndUpdate(
      { user: userId, course: courseId, status: "pending" },
      {
        paymentId: order.id,
        amount: course.price,
        paymentMethod: "razorpay",
      },
      { upsert: true, new: true },
    );

    res.status(200).json({ success: true, order, course });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res
      .status(500)
      .json({ message: "Error creating payment order", error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    // Secure verification using timingSafeEqual
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpay_signature),
    );

    if (!isAuthentic)
      return res.status(400).json({ message: "Invalid signature" });

    // Atomic update
    const purchase = await CoursePurchase.findOneAndUpdate(
      { paymentId: razorpay_order_id },
      { status: "completed", transactionId: razorpay_payment_id },
      { new: true },
    );

    if (!purchase)
      return res.status(404).json({ message: "Purchase record not found" });

    res
      .status(200)
      .json({
        success: true,
        message: "Enrolled successfully!",
        courseId: purchase.course,
      });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res
      .status(500)
      .json({ message: "Error verifying payment", error: error.message });
  }
};


// Webhook Handler (Safety Net)
export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // Verify Signature using the RAW body
    // If you used express.raw() above, req.body is a Buffer
    const isValid = Razorpay.validateWebhookSignature(
      req.body.toString(),
      signature,
      secret,
    );

    if (!isValid) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    // Parse the body now that it's verified
    const event = JSON.parse(req.body.toString());

    // Handle 'payment.captured'
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const transactionId = payment.id;

      // Update Purchase and find user/course info
      const purchase = await CoursePurchase.findOneAndUpdate(
        { paymentId: orderId, status: "pending" }, // Only update if still pending
        { status: "completed", transactionId: transactionId },
        { new: true },
      );

      if (purchase) {
        // Grant access to the course in the User model
        await User.findByIdAndUpdate(purchase.user, {
          $addToSet: { enrolledCourses: purchase.course },
        });
        console.log(`Successfully processed order: ${orderId}`);
      }
    }

    //  Always return 200 to Razorpay immediately
    res.status(200).send({ status: "ok" });
  } catch (error) {
    console.error("Webhook Error:", error);
    // Don't send 500 unless you want Razorpay to retry the webhook repeatedly
    res.status(200).send("Handled with error");
  }
};














































/*
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    // Prevent duplicate purchase if already completed
    const existingPurchase = await CoursePurchase.findOne({
      user: userId,
      course: courseId,
      status: "completed",
    });
    if (existingPurchase) {
      return res.status(400).json({ message: "You already own this course!" });
    }

    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      course: courseId,
      user: userId,
      amount: course.price,
      status: "pending",
      paymentMethod: "razorpay",
    });

    // Create Razorpay order
    const options = {
      amount: Math.round(course.price * 100), // Amount in paise
      currency: "INR",
      receipt: `course_${courseId}`,
      notes: {
        courseId: courseId,
        userId: userId,
      },
    };
 
      //OR
      
    // Razorpay Options
    /*const options = {
      amount: Math.round(course.price * 100), // Ensuring integer for paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { courseId, userId },
    };*//*

    const order = await razorpay.orders.create(options);

    // Save payment ID to purchase record
    newPurchase.paymentId = order.id;
    await newPurchase.save();

    res.status(200).json({
      success: true,
      order,
      course: {
        name: course.title,
        description: course.description,
        image: course.thumbnail,
      },
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res
      .status(500)
      .json({ message: "Error creating payment order", error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Update purchase record
    const purchase = await CoursePurchase.findOne({
      paymentId: razorpay_order_id,
    });
    if (!purchase) {
      return res.status(404).json({ message: "Purchase record not found" });
    }

    purchase.status = "completed";
    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      courseId: purchase.course,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res
      .status(500)
      .json({ message: "Error verifying payment", error: error.message });
  }
};
*/