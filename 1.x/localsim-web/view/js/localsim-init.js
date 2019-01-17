var __conf = null;


function conf(c=null){
    var __conf = null;

    if(c){
        __conf = c;
    }
    else{
        if(__conf == null){
            __conf = new ConfigObject();
        }
    }

    return __conf;
}