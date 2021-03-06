import express from 'express'
import bodyParser from 'body-parser'
import fetch from 'node-fetch';
import dotenv from 'dotenv'
dotenv.config()
var app = express()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const port = process.env.PORT || 8080

// Webhook cache example
// {
//     "16231695-JD-UK": {
//         "timestamp": 1500000000000
//     }
// }

let WEBHOOK_CACHE = {}

app.post('/webhook', async function (req, res) {
    // checks for unauthorized people trying to access the webhook
    if (req.header("x-api-key") !== process.env.API_KEY) {
        res.status(401).send("Failed to send webhook, unauthorized");
    }
    try {
        // this will be different for each webhook dependent on your webhook format
        var webhookFields = JSON.parse(JSON.stringify(req.body))["embeds"][0]["fields"]
    } catch {
        res.status(400).send("Failed to parse webhook, check format!")
    } finally {
        let site = webhookFields[1]["value"]
        let product = webhookFields[2]["value"]
        // checks if the webhook is already in the cache
        if (checkWebhookInCache(site, product)) {
            res.status(200).send("Webhook already in cache")
        } else {
            // sends the webhook and add to cache
            try {
                await fetch(process.env.WEBHOOK, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(req.body)
                })
                WEBHOOK_CACHE[`${product}-${site}`] = {
                    "site" : site,
                    "product": product,
                    "timestamp": Date.now(),
                }
                res.status(200).send("Webhook sent and added to cache")
            } catch {
                res.status(500).send("Failed to send webhook, error processing request")
            }
        }
    }
    
})


function checkWebhookInCache(site, product) {
    if (WEBHOOK_CACHE[`${product}-${site}`]) {
        if (WEBHOOK_CACHE[`${product}-${site}`].timestamp > Date.now() - 60000) {
            return true
        }
    }
    // deletes the hook cache
    delete WEBHOOK_CACHE[`${product}-${site}`]
    return false
}

//start the server
app.listen(port,()=>{
    console.log(`Listening on port ${port}`)
});