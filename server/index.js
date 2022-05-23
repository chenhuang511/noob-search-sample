const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require('path')
const {Client} = require('@elastic/elasticsearch')

const client = new Client({
    node: 'http://172.16.1.31:9200'
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
        index: 'wiki',
        query: {
            match: {
                'title.ngram': {
                    query: q,
                    fuzziness: 'AUTO'
                }
            }
        },
        _source: false,
        fields: [
            'title'
        ]
    })
    return result.hits.hits.map(h => h.fields['title'].pop().trim())
}

const search = async (q) => {
    //calculate slop for match_phrase
    let qLen = q.split(' ').length
    let slop = qLen > 3 ? 2 : 1

    const result = await client.search({
        index: 'wiki',
        track_total_hits: true,
        query: {
            bool: {
                should: [
                    {
                        multi_match: {
                            query: q,
                            fields: ['title', 'summary'],
                            fuzziness: 'AUTO'
                        }
                    },
                    {
                        match_phrase: {
                            title: {
                                query: q,
                                slop: slop
                            }
                        }
                    },
                    {
                        match_phrase: {
                            author: {
                                query: q,
                                slop: slop
                            }
                        }
                    }
                ]
            }
        },
        highlight: {
            fields: {
                title: {
                    pre_tags: '<strong>',
                    post_tags: '</strong>'
                },
                summary: {
                    pre_tags: '<strong>',
                    post_tags: '</strong>'
                }
            }
        }
    })

    let hits = []
    let took = result.took
    let total = result.hits.total.value
    for (let h of result.hits.hits) {
        let _id = h._id
        let _score = h._score
        let title = h.highlight && h.highlight.title ? h.highlight.title.pop() : h._source.title
        let description = h._source.summary
        hits.push({_id, _score, title, description})
    }

    return {took, total, hits}
}

const detail = async (q) => {
    return await client.get({
        index: 'wiki',
        id: q
    })
}

// suggest().catch()
// search().catch()