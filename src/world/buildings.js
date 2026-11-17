const buildingModels = {
  House1:{name:'Casa simples',width:128,height:192,cost:{coins:20,wood:10,gold:5}},
  House2:{name:'Casa com varanda',width:128,height:192,cost:{coins:30,wood:15,gold:8}},
  House3:{name:'Casa grande',width:128,height:192,cost:{coins:40,wood:20,gold:10}},
  Tower:{name:'Torre',width:128,height:256,cost:{coins:50,wood:25,gold:15}},
  Barracks:{name:'Quartel',width:192,height:256,cost:{coins:70,wood:35,gold:20}},
  Archery:{name:'Campo de arqueiros',width:192,height:256,cost:{coins:65,wood:30,gold:20}},
  Monastery:{name:'Mosteiro',width:192,height:320,cost:{coins:90,wood:40,gold:30}},
  Castle:{name:'Castelo',width:320,height:256,cost:{coins:150,wood:80,gold:50}}
};
function getBuildingModel(id){return buildingModels[id]||buildingModels.House1;}
function buildingEntrance(site,model){return {x:site.x+getBuildingModel(model).width/128,y:site.y+1.5};}
