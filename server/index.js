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
        index: 'books',
        suggest: {
            text: q,
            suggest_1: {
                completion: {
                    field: 'title.completion',
                    fuzzy: {
                        fuzziness: 'AUTO'
                    },
                    size: 3
                }
            },
            suggest_2: {
                completion: {
                    field: 'author.completion',
                    fuzzy: {
                        fuzziness: 'AUTO'
                    },
                    size: 3
                }
            },
            suggest_3: {
                completion: {
                    field: 'publisher.completion',
                    fuzzy: {
                        fuzziness: 'AUTO'
                    },
                    size: 3
                }
            }
        }
    })
    let suggests = result.suggest
    let texts = []
    let suggest1 = suggests.suggest_1.pop().options
    for (let s of suggest1) texts.push(s.text)

    let suggest2 = suggests.suggest_2.pop().options
    for (let s of suggest2) texts.push(s.text)

    let suggest3 = suggests.suggest_3.pop().options
    for (let s of suggest3) texts.push(s.text)

    return texts
}

const search = async (q) => {
    //calculate slop for match_phrase
    let qLen = q.split(' ').length
    let slop = qLen > 3 ? 2 : 1

    const result = await client.search({
        index: 'books',
        track_total_hits: true,
        query: {
            bool: {
                should: [
                    {
                        multi_match: {
                            query: q,
                            fields: ['title^3', 'author^2', 'publisher'],
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
                    },
                    {
                        match_phrase: {
                            publisher: {
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
                author: {
                    pre_tags: '<strong>',
                    post_tags: '</strong>'
                },
                publisher: {
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
        let author = h.highlight && h.highlight.author ? h.highlight.author.pop() : h._source.author
        let publisher = h.highlight && h.highlight.publisher ? h.highlight.publisher.pop() : h._source.publisher
        let description = `Author: ${author} <br>Publisher: ${publisher} <br>Publish year: ${h._source.publish_year} <br>ISBN: ${h._source.isbn}`
        hits.push({_id, _score, title, description})
    }

    return {took, total, hits}
}

const detail = async (q) => {
    return await client.get({
        index: 'books',
        id: q
    })
}

// suggest().catch()
// search().catch()