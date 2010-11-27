var http = require('http'),
    path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn;

http.createServer(function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end('unrar_all Running!\n');
}).listen(8124);

console.log('Server running at http://192.168.0.7:8124');

function scan_dir(path_string,callback){
  var normalized_path = path.normalize(path_string);

  //Doesn't follow symbolic links, this is to prevent infinite loops
  //TODO could support them if it was smart enough to detect a loop
  fs.lstat(path_string,function(err,stats){
    if(err){
      console.log('Error while trying to read scan_dir\'s path:'+path_string);
      callback([]);
    }else{
      if(stats.isDirectory()){
        fs.readdir(path_string,function(err,files){
          var rar_files = files.filter(is_RAR_file).map(function(fn){return path.join(path_string,fn);}),
              scan_count = 0,
              number_of_files = files.length;
          if(files.length > 0){          
            files.forEach(function(file_name){
              scan_dir(path.join(path_string,file_name),function(recursive_rars){
                rar_files = rar_files.concat(recursive_rars);
                scan_count += 1;
                if(scan_count === number_of_files){
                  callback(rar_files);
                }
              });
            });
          }else{
            callback(rar_files);
          }
        });
      }else{
        callback([]);
      }
    }  
  });
}

function is_RAR_file(file_name){
  return path.extname(file_name) === '.rar';
}

function is_first_volume(file_name){
  var matches = /\.part(\d+)\.rar$/.exec(file_name);
  if(matches === null){
    return true;
  }else{
    return matches[1] == 1;
  }
}

// "/home/jsmith/Code/test_rar_dir"
// "/home/jsmith/TVShows"
scan_dir("/home/jsmith/TVShows",function(rar_files){
  var first_volumes = rar_files.filter(is_first_volume);
  first_volumes.forEach(function(res){
    console.log('res:'+res);
  });
});
