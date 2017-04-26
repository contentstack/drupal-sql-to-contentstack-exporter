var sequence         = require('when/sequence');
global.config = require('./config');
// global.querypageconfig = require('./query');
global.errorLogger = require("./libs/utils/logger.js")("error").error;
global.successLogger = require("./libs/utils/logger.js")("success").log;
global.warnLogger = require("./libs/utils/logger.js")("warn").log;



var modulesList = ['query','contentTypes','vocabulary','assets','authors','taxonomy','page'];
var _export = [];
if(process.argv.length == 3 || process.argv.length == 4) {
    global.ids = undefined;
    var val = process.argv[2];
    if(val && modulesList.indexOf(val) != -1){
        var ModuleExport = require('./libs/export/'+val+'.js');
        var moduleExport = new ModuleExport();
        _export.push(function(){
            return moduleExport.start() ;
        })
    }else {
        console.log("please provide valid module name.")
        return 0;
    }
}else if(process.argv.length==2){
    global.ids = undefined;
    for(var i = 0, total = modulesList.length; i < total - 1; i++) {
        var list = i + 1;
        var ModuleExport = require('./libs/export/' + modulesList[list] + '.js');
        var moduleExport = new ModuleExport();
        _export.push(function(moduleExport){
            return function(){ return moduleExport.start() } ;
        }(moduleExport));

    }
}else{
    console.log("only one module can be exported at a time.");
    return 0;
}

var taskResults = sequence(_export);
taskResults
    .then(function(results) {
        console.log("migration has been completed.");
    })
    .catch(function(error){
        console.log(error);
    });

