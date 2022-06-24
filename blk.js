const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Stores the beginning time
const beginTime = new Date().getTime()

// Actions job timelimit of 6 hours
const sixHoursMillis = 21600000
// Slack for job timelimit for sixty minutes
const sixtyMinsMillis = 3600000
// max duration with slack, i.e 5hours
const maxDuration = sixHoursMillis - sixtyMinsMillis


let toEmailsListPath = path.join(__dirname, 'email-list.txt')

let sentEmailsListPath = path.join(__dirname, 'sent-emails.txt')

let debugLogPath = path.join(__dirname, 'debug.json')

let domainName = process.env.domainname
let userName = process.env.username
let password = process.env.password
let fromName = process.env.fromname
let subject = process.env.subject
let workersURL = process.env.workersurl
let message = process.env.message



async function begin() {


  // Array of emails to send message to, max 50 emails at one time
  let toEmails = fs.readFileSync(toEmailsListPath).toString().trim().split(/\r?\n/).filter(elem => !/^\s*$/.test(elem)).map(e => e.toLowerCase().trim())

  // Remove duplicates
  toEmails = [...new Set(toEmails)];

  let sentEmails = fs.readFileSync(sentEmailsListPath).toString().trim().split(/\r?\n/).filter(elem => !/^\s*$/.test(elem)).map(e => e.toLowerCase().trim())
  sentEmails = [...new Set(sentEmails)];
  // Don't send to emails, which I have already sent
  toEmails = toEmails.filter(e => !sentEmails.includes(e))

  let counter = 0;
  for (let toEmail of toEmails) {
    if (!checkSufficientTime())
      break;

    console.log("starting for email", toEmail)
    await sleepRandom(7000)
    try {
        let data;
        if (false) {
          data = await sendMessage(userName, password, fromName, toEmail, subject, message)
          if (data['accepted'][0].trim() == toEmail)
            saveSentEmail(toEmail)
        }
        else {
          data = await mailChannel(userName, fromName, toEmail, subject, message)
          if (data[0]['value'][1])
            saveSentEmail(toEmail)
        }
        fs.appendFileSync(debugLogPath, `\n${JSON.stringify(data).replace(new RegExp(domainName, 'ig'), "")}`)
      } catch (error) { console.error(error) }
  
      counter++;
    }




}

// Returns true if sufficient time is there
function checkSufficientTime() {
  const currentDuration = new Date().getTime() - beginTime
  if (currentDuration < maxDuration)
    return true

  return false
}

async function sleep(ms) {
  return await new Promise(resolve => setTimeout(resolve, ms));
}

async function sleepRandom(ms) {
  await sleep(Math.floor(Math.random() * ms))
}

function saveSentEmail(email) {
  fs.appendFileSync(sentEmailsListPath, `\n${email}`)
}

async function mailChannel(userName, fromName, sendTo, subject, message) {

  let jsonData =
  {
    // Warning, this code only works for single email, if sending more than 1 emails at time, then you have to update this code
    // For example have to update appendFileSync to save the bulk emails
    "toEmails": [sendTo],
    "fromEmail": userName,
    "fromName": fromName,
    "subject": subject,
    "message": message,
    "contentType": "text/html; charset=UTF-8",
  }
  let res = await fetch(workersURL, {
    method: 'POST',
    body: JSON.stringify(jsonData)
  })
  let data = await res.json()

  return data;



  /*
Returns
[
  {
    status: 'fulfilled',
    value: [toEmail, response.ok, response.status] 
  },
  {
    status: 'fulfilled',
    value: [toEmail, response.ok, response.status] 
  },
  {
    status: 'rejected',
    reason: ""
  }
 
]
 
 
*/



}

// smtp yandex mail
async function sendMessage(userName, password, fromName, sendTo, subject, message) {
  const transporter = nodemailer.createTransport({
    host: "smtp.yandex.com",
    port: 465,
    secure: true, // upgrade later with STARTTLS
    auth: {
      user: userName,
      pass: password,
    },
  });

  let info = await transporter.sendMail({
    from: `${fromName} <${userName}>`, // sender address
    to: sendTo, // list of receivers
    subject: subject, // Subject line
    // text: message, // plain text body
    html: message, // html body
  });

  return info;

  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>


}

begin()
