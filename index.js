const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const mysql = require('mysql');

const app = express();
const port = 5500;

app.use(bodyParser.json());

const senderEmail = "parth.burange22@gmail.com";
const senderPassword = "swoilqobbxdafhtw";
const fixedRecipientEmail = "202201202@vupune.ac.in"; 

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    port: '3306'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: senderEmail,
        pass: senderPassword,
    },
});

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.post("/send-email", (req, res) => {
    const recipientEmail = req.body?.recipientEmail ? req.body.recipientEmail : fixedRecipientEmail;
    console.log(req.body)
    const sixDigitRandomNumber = Math.floor(100000 + Math.random() * 900000);
    console.log(`SELECT email, passwords FROM message.otps WHERE email = ${recipientEmail}`)

    // Check if the recipient email exists in the database
    db.query(`SELECT email, passwords FROM message.otps WHERE email = ${recipientEmail}`, (err, results) => {
        console.log(err,results)
        if (err) {
            console.error("Error:", err);
            res.status(500).json({ success: false, message: "Error retrieving data from the database." });
            return;
        }

        if (results.length === 0) {
            // Email not found in the database
            res.status(404).json({ success: false, message: "Email not found." });
            return;
        }

        const storedPassword = results[0].passwords;

        // Validate password
        if (req.body.password !== storedPassword) {
            res.status(401).json({ success: false, message: "Invalid password." });
            return;
        }

        const mailOptions = {
            from: senderEmail,
            to: recipientEmail,
            subject: "Your One-Time Password (OTP) for Login",
            text: `Hello,\n\nThank you for using the Nobel Hospital Login Portal. Your one-time password (OTP) is ${sixDigitRandomNumber}. Please use this OTP to complete the login process. Do not share this OTP with anyone for security reasons. If you did not attempt to log in, your email is being used without your knowledge; contact the admin as soon as possible.`,
        };

        // Store OTP in the database
        db.query('INSERT INTO message.otps (email, otp, passwords) VALUES (?, ?, ?)', [recipientEmail, sixDigitRandomNumber, storedPassword], (insertErr, insertResult) => {
        db.commit
        
            if (insertErr) {
                console.error("Error:", insertErr);
                res.status(500).json({ success: false, message: "Error storing OTP in the database." });
                return;
            }
            console.log('OTP sent and stored in the database');

            // Send email
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Error:", error);
                    res.status(500).json({ success: false, message: "Error sending email." });
                } else {
                    console.log("Email sent:", info.response);
                    res.status(200).json({ success: true, message: "Email sent successfully." });
                }
            });
        });
    });
});

app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
