/**
 * Created by pradeep on 6/3/17.
 */
var mkdirp    = require('mkdirp'),
    path      = require('path'),
    fs = require('fs'),
    when      = require('when'),
    guard       = require('when/guard'),
    parallel    = require('when/parallel');


/**
 * Internal module Dependencies.
 */
var helper = require('../../libs/utils/helper.js');

var vocabularyConfig = config.modules.vocabulary,
    vocabularyFolderPath = path.resolve(config.data, config.entryfolder,vocabularyConfig.dirName),
    masterFolderPath = path.resolve(config.data, 'master',config.entryfolder),
    limit = 100;

/**
 * Create folders and files
 */
if (!fs.existsSync(vocabularyFolderPath)) {
    mkdirp.sync(vocabularyFolderPath);
    helper.writeFile(path.join(vocabularyFolderPath,  vocabularyConfig.fileName))
    mkdirp.sync(masterFolderPath);
    helper.writeFile(path.join(masterFolderPath, vocabularyConfig.masterfile),'{"en-us":{}}')
}

function ExtractTaxonomy(){
    this.connection=helper.connect();
}

ExtractTaxonomy.prototype = {
    putVocabulary: function (vocabulary) {
        var vocabularyData = helper.readFile(path.join(vocabularyFolderPath, vocabularyConfig.fileName));
        var masterdata =helper.readFile(path.join(masterFolderPath, vocabularyConfig.masterfile));
        return when.promise(function (resolve, reject) {
            vocabulary.map(function (data, index) {
                vocabularyData[data["title"]] ={
                    "title": data["title"],
                    "description":data["description"]
                }
                masterdata["en-us"][data["title"]] ="";
            })
            helper.writeFile(path.join(vocabularyFolderPath, 'en-us.json'), JSON.stringify(vocabularyData, null, 4))
            helper.writeFile(path.join(masterFolderPath, "vocabulary.json"), JSON.stringify(masterdata, null, 4))
        })
    },
    getAllVocabularies: function(skip){
        var self = this;
        return when.promise(function(resolve, reject){
            // self.connection.connect()
            var query = config["mysql-query"]["vocabulary"];
            query = query + " limit " + skip + ", "+limit;
            self.connection.query(query, function(error, rows, fields) {
                if(!error){
                    if(rows.length>0){
                        self.putVocabulary(rows)
                        resolve();
                    }
                }else{
                    errorLogger('failed to get vocabulary: ', error);
                    reject(error);
                }
            })
        })
    },
    getVocabulariesCount: function (vocabularycount) {
        var self = this;
        return when.promise(function (resolve, reject) {
            var _getVocabulary = [];
            for(var i = 0, total = vocabularycount; i < total; i+=limit){
                _getVocabulary.push(function (data) {
                    return function () {
                        return self.getAllVocabularies(data);
                    }
                }(i));
            }
            var guardTask = guard.bind(null, guard.n(1));
            _getVocabulary = _getVocabulary.map(guardTask);
            var taskResults = parallel(_getVocabulary);
            taskResults
                .then(function(results) {
                    self.connection.end();
                    resolve();
                })
                .catch(function(e) {
                    errorLogger("something wrong while exporting vocabularies:",e);
                    reject(e);
                })
        })
    },
    start: function () {
        successLogger("exporting vocabulary...");
        var self = this;
        return when.promise(function(resolve, reject) {
           self.connection.connect()
            var query = config["mysql-query"]["vocabularyCount"];
            self.connection.query(query, function (error, rows, fields) {
                if (!error) {
                    var vocabularycount = rows[0]["vocabularycount"];
                    if (vocabularycount > 0) {
                        self.getVocabulariesCount(vocabularycount)
                            .then(function(){
                                resolve()
                            })
                            .catch(function(){
                                reject()
                            })
                    } else {
                        errorLogger("no vocabulary found");
                        self.connection.end();
                        resolve();
                    }
                } else {
                    errorLogger('failed to get vocabulary count: ', error);
                    self.connection.end();
                    reject(error)
                }
            })
        })


    }
}

module.exports = ExtractTaxonomy;