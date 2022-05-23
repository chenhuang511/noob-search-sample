const fs = require('fs')
const {Client} = require('@elastic/elasticsearch')

const dataPath = './server/vi_wiki_p1.txt'

const client = new Client({
    node: 'http://172.16.1.31:9200'
})

const indexDoc = async (doc) => {
    await client.index({
        index: 'wiki',
        document: doc
    })
}

const run = async () => {
    const data = fs.readFileSync(dataPath, 'utf8')
    // console.log(data.substring(0, 1000))
    const parsed = data.trim().split('\r\n\r\n')
    let report = 0
    // console.log(parsed.length)
    // for (let item of parsed) {
    //     report++
    //     if (report < 5)
    //         console.log(report + ' ' + item)
    // }
    for (let item of parsed) {
        try {
            const _index = item.indexOf('\n')
            let title = item.substring(0, _index)
            let desc = item.substring(_index + 1)
            let summary = desc.slice(0, 200)
            await indexDoc({title, summary, desc})
            report++
        } catch (e) {
            console.log(e)
        }
    }
    console.log(`Done with ${report} items`)
}

run().catch()