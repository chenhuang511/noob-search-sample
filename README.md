## noob-search-sample
This is sample app that demonstrate how elasticsearch is used for searching like Google.

## ElasticStack Setup
* ElasticSearch 7.16.3
* Kibana 7.16.3
* Logstash 7.16.3
* Installed VM (Virtual box - CentOS 7): [https://drive.google.com/file/d/1P1H0Tsb4i29t2TGxg4CXsgWvm-Bvh_YA/view?usp=sharing](https://drive.google.com/file/d/1P1H0Tsb4i29t2TGxg4CXsgWvm-Bvh_YA/view?usp=sharing)

## Dataset

* 1.203.165 Vietnamese Wikipedia articles [https://drive.google.com/file/d/1Amh8Tp3rM0kdThJ0Idd88FlGRmuwaK6o/view](https://drive.google.com/file/d/1Amh8Tp3rM0kdThJ0Idd88FlGRmuwaK6o/view)
* Size: 780 MB

## Index mapping

```javascript
PUT wiki
{
  "settings" : {
    "analysis" : {
      "filter" : {
        "ascii_filter" : {
          "type" : "asciifolding",
          "preserve_original" : "true"
        },
        "ngram_filter" : {
          "type" : "edge_ngram",
          "min_gram" : "1",
          "max_gram" : "10"
        }
      },
      "analyzer" : {
        "vi_analyzer" : {
          "filter" : [
            "lowercase",
            "ascii_filter",
            "ngram_filter"
          ],
          "type" : "custom",
          "tokenizer" : "vi_tokenizer"
        }
      }
    }
  },
  "mappings": {
    "properties" : {
        "desc" : {
          "type" : "text"
        },
        "summary" : {
          "type" : "text"
        },
        "title" : {
          "type" : "text",
          "fields" : {
            "ngram" : {
              "type" : "text",
              "analyzer" : "vi_analyzer"
            }
          }
        }
      }
  }
}
```

## NoobSearch webapp sample setup
* Change elasticsearch host in ```server/index.js```
* Run: ```npm i```
* Run: ```node server/index.js```
