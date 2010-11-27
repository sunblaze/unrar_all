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

function is_volume_one(file_path,callback){
  var child = spawn('unrar',['l',file_path]),
      out_buffer = new Buffer(200 * 1024),
      out_length = 0;
  
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', function (data) {
    out_length += out_buffer.write(data,out_length);
  });
  
  child.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });
  
  child.on('exit', function (code) {
    var out_string = out_buffer.toString('utf8',0,out_length);

    if(code === 0){
      var matches = /volume (\d+)\s*$/.exec(out_string);
      if(matches !== null){
        callback(matches[1] === "1");
      }else{
        callback(/\d+%\s*$/.test(out_string));
      }
    }else{
      callback(false);
    }
  });
}

function only_volume_ones(file_paths,callback){
  if(file_paths.length > 0){
    is_volume_one(file_paths[0],function(result){
      var good = result ? [file_paths[0]] : [];
      file_paths.shift();
      only_volume_ones(file_paths,function(files){
        callback(good.concat(files));
      });
    });
  }else{
    callback([]);
  }
}

// "/home/jsmith/Code/test_rar_dir"
// "/home/jsmith/TVShows"

scan_dir("/home/jsmith/TVShows",function(rar_files){
  // var front_volumes = rar_files.filter(is_volume_one);
  // is_volume_one(rar_files[2],function(result){console.log('res:'+result);});
  
  console.log("all:"+rar_files.length);
  console.log("ones:"+rar_files.filter(is_first_volume).length);
  
  // only_volume_ones(rar_files,function(result){
    // console.log("ones:"+result.length);
    // result.forEach(function(res){
      // console.log('res:'+res);
    // });
  // });
});
