'use strict';
var fs = require('fs')
  , path = require('path');

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}

function parseJson(jsonPath) {

  var stats = fs.statSync(jsonPath); 
  
  if ((stats) && (stats.isFile())) {
    return require(jsonPath);
  }
  else {
    console.log(jsonPath + ' does not exist. Creating blank object.');
    return {};
  }

}

function createPath(packagePath) {
  var localPath = './';

  packagePath = packagePath || localPath;
  packagePath = (packagePath === '') ? localPath : packagePath;

  if (packagePath.substr(-1, 1) !== '/') {
    packagePath += '/';
  }  
  
  return packagePath;
}

function buildInitialObject(packagePath) {

  var obj = {};
  
  obj.config = parseJson(packagePath + 'config.json');
  obj.pisync = parseJson(packagePath + 'pisync.json');

  return obj;

}

function buildTasks(tasksPath) {

  tasksPath = createPath(tasksPath);
    
  var tasks = {};

  var folders = getDirectories(tasksPath);

  folders.forEach(function(folder) {
    
    var taskPath = tasksPath + folder + 'pisync.task.js';
    
    var stats = fs.statSync(taskPath); 
    
    if ((stats) && (stats.isFile())) {
      var task = require(taskPath)();

      if (validateTask(folder, task)) {
        tasks[folder] = task;
      }

    }

  });

  return tasks;  
}

function validateTask(name, task) {

  if ((task !== null && typeof task === 'object') && 
    (task.hasOwnProperty('commands') ||
    (task.hasOwnProperty('hook')    
    ))) {
    return true;
  }
  else {
    console.log('Task ' + name + ' failed. Not loaded.');
    return false;
  }
  
}

module.exports = {
  buildRuntime: function(runtimePath, additionalTasks) { //additionalTasks = {"watch": { ... }}

    var tasks = {};

    runtimePath = createPath(runtimePath);

    var runtime = buildInitialObject(runtimePath);
    runtime.tasks = buildTasks(runtimePath);

    if (additionalTasks !== null && typeof additionalTasks === 'object') {

      Object.keys(additionalTasks).forEach(function(key) {

        if (validateTask(key, additionalTasks[key])) {

          var targetKey = key
            , inc = 1;
          while (tasks.hasOwnProperty(targetKey)) {
            targetKey = targetKey + (++inc);
          }
  
          tasks[targetKey] = additionalTasks[targetKey];

        }
        
      });
      
    }

    return runtime;

  },
  buildTask: function(taskPath) {
            
    taskPath = createPath(taskPath);
    
    var task = buildInitialObject(taskPath);
    task.types = {};

    var optionsPath =  taskPath + 'options/'
      , folders = getDirectories(optionsPath);

    folders.forEach(function(folder) {

      var optionPath = optionsPath + folder + '/'
        , commandsPath = optionPath + 'commands.json'
        , stats = fs.statSync(commandsPath); 
      
      if ((stats) && (stats.isFile())) {
        
        var configPath = optionPath + 'config.json'
          , hookPath = optionPath  + 'hook.js';

        task.types[folder] = {};
        task.types[folder].commands = parseJson(commandsPath);
        task.types[folder].config = parseJson(configPath)

        var hookStats = fs.statSync(hookPath); 
        
        if ((hookStats) && (hookStats.isFile())) {
          task.types[folder].hook = require(hookPath);
        }
        else {
          task.types[folder].hook = function($, callback) {callback()};          
          console.log(hookPath + ' does not exist. Creating empty hook.');
        }        
      };
    }); 
    
    return task;        
  },
  buildTasks: buildTasks
};