const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require('path')
const {Client} = require('@elastic/elasticsearch')

const client = new Client({
    node: 'http://172.16.1.98:9200'
})

app.listen(3001, () => {
    console.log("Server started and Listening on port 3001");
});

// get our app to use body parser
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static('./'))

app.get('/', ((req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'))
}))

app.get('/suggest', async (req, res) => {
    const text = req.query.q
    let hits = await suggest(text)
    hits = hits.map(h => h._source.title)
    res.send(hits)
})

app.get('/search', async (req, res) => {
    const text = req.query.q
    console.log(`search '${text}'`)
    let result = await search(text)
    res.send(JSON.stringify(result))
})

app.get('/detail', async (req, res) => {
    const id = req.query.id
    const doc = await detail(id)
    res.json(doc)
})

const suggest = async (q) => {
    const result = await client.search({
        index: 'amazon_products',
        query: {
            match: {
                'title.ngram': {
                    query: q,
                    fuzziness: 'AUTO'
                }
            }
        }
    })
    return result.hits.hits
    // let hits = result.hits.hits
    // hits = hits.map(h => h._source.title)
    // console.log(hits)
}

const search = async (q) => {
    const result = await client.search({
        index: 'amazon_products',
        query: {
            multi_match: {
                query: q,
                fields: ['title^3', 'description']
            }
        },
        highlight: {
            fields: {
                description: {
                    pre_tags: '<strong>',
                    post_tags: '</strong>'
                },
                title: {
                    pre_tags: '<strong>',
                    post_tags: '</strong>'
                }
            }
        }
    })
    // console.log(result)
    return result
}

const detail = async (q) => {
    return await client.get({
        index: 'amazon_products',
        id: q
    })
}

// suggest().catch()
// search().catch()