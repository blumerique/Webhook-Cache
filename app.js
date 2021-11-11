var express = require('express')
var bodyParser = require('body-parser')
var app = express()
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Webhook cache example
// {
//     "16231695-JD-UK": {
//         "site" : "JD-UK",
//         "product": "16231695",
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
        webhookBody = JSON.parse(JSON.stringify(req.body))
        webhookFields = webhookBody["embeds"][0]["fields"]
        site = webhookFields[1]["value"]
        product = webhookFields[2]["value"]
    } catch {
        res.status(400).send("Failed to parse webhook, check format!")
    } finally {
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
            } catch {
                res.status(500).send("Failed to send webhook, error processing request")
            }
        }
    }
    
})


function checkWebhookInCache(site, product) {
    if (WEBHOOK_CACHE[`${product}-${site}`]) {
        if (WEBHOOK_CACHE[`${product}-${site}`].timestamp > Date.now() - 150000) {
            return true
        }
    }
    // deletes the hook cache
    delete WEBHOOK_CACHE[`${product}-${site}`]
    return false
}

console.log("+++ Listening +++")
app.listen(3000, function () {})