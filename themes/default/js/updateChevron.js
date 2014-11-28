/*
 *  Copyright (c) 2005-2014, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 *
 */
jsPlumb.ready(function(e)
{

   chevronProperties = []; //store properties of each chevron
   var processId = 0; // store current process id of the chevron clicked  
   var specializations = []; //store successor/predecessor relations for a chevron
   var chevrons = []; //save element props for later
   var formatting = []; //save layout of elements for later
   var nameEdit = false; // if the name of chevron edited
   var stateDragged = false; // if the chevron was moved in canvas
   var relationPositions = []; // to hold chevron position changes to derive relationships
   var relationsReset = false; //check if pre/successor relationships got updated
   var editName = false; //check if chevron name got edited
   var positionChanged = false; //check for position updates
   var idList = []; // list of chevron ids on canvas
   var isNewElement; // adding new element to existing diagram
  var newElementPosX;
  var newElementPosY;
  var newElementProcess;
  var notNewElement=false;
  var predecessorCount=0;  // To keep track of the very first element's predecessor
  var flowList= []; //store original position order of elements

   // associated process token store
   var assets = {
      data: []
   };
   var currentId; //current clicked chevron Id

   $("#editMainProps").show();
   $("#editElementProps").hide();

   $('#save').css('visibility', 'hidden');
   // ajax call to get the main chevron name of the diagram
   $.ajax(
   {
      type: "GET",
      url: "/publisher/asts/chevron/apis/nameStore",
      data:
      {
         type: "GET"
      },
      success: function(result)
      {
         getXmlForProcess(result);
      }
   });
   // on form submit re-save the canvas xml content
   $('#editAssetButton').click(function(e)
   {

      saveDiagram();
   });
   //function to save the updated values of the diagram back in server
   function saveDiagram()
   {

      var root = {};
      var xmlSection1 = [];
      var xmlSection2 = [];
      var xmlSection = [];
      var elements = [];
      var connects = [];
      var orders = [];

      var mainProcessName = $("#properties_name").val();

      for (var i in formatting)
      { // save the formatting values
         var item = formatting[i];
         connects.push(
         {
            "chevronId": item.chevronId,
            "X": item.positionX,
            "Y": item.positionY
         });
      }
      for (var i in specializations)
      { // save element flow
         var item = specializations[i];
         orders.push(
         {
            "sourceId": item.id,
            "targetId": item.successorId
         });
      }
      for (var i in chevrons)
      { // save element details
         var item = chevrons[i];

         elements.push(
         {

            "chevronId": item.chevronId,
            "chevronName": item.chevronName,
            "associatedAsset": item.processModel
         });
      }
      xmlSection1.push(
      {
         mainProcess: mainProcessName,
         element: elements,
         flow: orders
      });
      xmlSection2.push(
      {
         format: connects
      });
      xmlSection.push(
      {
         chevrons: xmlSection1,
         styles: xmlSection2
      });
      root.xmlSection = xmlSection;
      var savedCanvas = JSON.stringify(root);

      var x2js = new X2JS();
      var strAsXml = x2js.json2xml_str(savedCanvas); // convert to xml
      $("#xmlArea").val(x2js.json2xml_str($.parseJSON(savedCanvas)));

      //ajax call to save value in api
      $.ajax(
      {
         type: "POST",
         url: "/publisher/asts/chevron/apis/chevronxml",
         data:
         {
            content: strAsXml,
            name: mainProcessName,
            type: "POST"
         }
      })

      .done(function(result) {
         // alert(result);
      });

   }

   //function to get the specific xml content for the given process
   function getXmlForProcess(process)
   {

      $.ajax(
      {
         type: "GET",
         url: "/publisher/asts/chevron/apis/chevronxml",
         data:
         {
            type: "GET",
            name: process
         },
         success: function(xmlResult)
         {

            drawDiagramOnCanvas(xmlResult, process);
         }
      });
   }

   //save the state of each chevron
   var saveState = function(mainProcess, id, name, process, xValue, yValue)
   {

      var mainProcessName = mainProcess; //state is first saved when element is dropped to canvas

      if (process == "" || process == null)
      {
         process = "None";
      }
      chevrons.push(
      {
         diagramName: mainProcessName,
         chevronId: id,
         chevronName: name,
         processModel: process
      });
      formatting.push(
      {
         chevronId: id,
         positionX: xValue,
         positionY: yValue
      });

   }

   //function to draw retrived chevron content to canvas
   function drawDiagramOnCanvas(xmlResult, mainProcess)
   {

      var test = xmlResult;
      test = test.replace(/&quot;/g, '"');
      test = test.split(',');

      var jsonobj = eval("(" + test + ")");

      // get length of elements  array
      var numberOfElements = jsonobj.xmlSection[0].chevrons[0].element.length;

      //draw elements 
      for (var i = 0; i < numberOfElements; i++)
      {
         var chevronId = jsonobj.xmlSection[0].chevrons[0].element[i].chevronId;
         var chevronName = jsonobj.xmlSection[0].chevrons[0].element[i].chevronName;
         var source= jsonobj.xmlSection[0].chevrons[0].flow[i].sourceId;
         var successor= jsonobj.xmlSection[0].chevrons[0].flow[i].targetId;
         var positionX = jsonobj.xmlSection[0].styles[0].format[i].X;
         var positionY = jsonobj.xmlSection[0].styles[0].format[i].Y;
         var process = jsonobj.xmlSection[0].chevrons[0].element[i].associatedAsset;

         storePropertiesOfChevron(chevronId, chevronName, process); //store each chevron property

         var element1 = $('<div>').attr('id', 'chevronId').addClass('chevron');

         var textField = $('<textArea>').attr(
         {
            name: chevronId
         }).addClass("chevron-textField");

         textField.val(chevronName);
         element1.append(textField);

         element1.find('.chevron-text').position(
         { // position text box in the center of element
            my: "center",
            at: "center",
            of: element1
         });

         element1.css(
         {
            'top': positionY,
            'left': positionX

         });
         $('#canvasArea').append(element1);
         saveState(mainProcess, chevronId, chevronName, process, positionX, positionY); // save initial state of each chevron

         setPositionsForRelations(element1); // to keep track of pre/suc relationships when position is changed.
         //TO DO 
         flowList.push(source);
         flowList.push(successor);
        
      
         idList.push(chevronId);
         element1.click(chevronClicked);
      }
     for(i=0; i<flowList.length;i++)
     {
        first=flowList[i];
        second=flowList[++i];
       setPredecessor(second,first);
        
     }
     for(k=0; k<flowList.length;k++)
     {
      first=flowList[k];
        second=flowList[++k];
       setSuccessor(first,second);
     }

   }

   function setPositionsForRelations(element)
   {

      var id = element.find('.chevron-textField').attr('name');
      var name = element.find('.chevron-textField').text();
      var xValue = parseInt(element.css("left"), 10);
      var yValue = parseInt(element.css("top"), 10);

      relationPositions.push(
      {
         chevId: id,
         chevName: name,
         xVal: xValue,
         yVal: yValue
      });
   }

   function getProcessForChevron(id)
   {
      var nameOfProcess;

      for (i = 0; i < chevronProperties.length; i++)
      {
         if (id == chevronProperties[i].id)
         {
            nameOfProcess = chevronProperties[i].process;

            replaceProcessText(nameOfProcess); // replace process name as a link

         }

      }

   }

   function storePropertiesOfChevron(id, name, process)
   {
      if (process == "" || process == null)
      {
         process = "None";
      }

      chevronProperties.push(
      {
         id: id,
         name: name,
         process: process

      });
   }
   $('#canvasArea').dblclick(function(e)
   {
      $("#editMainProps").show();
      $("#editElementProps").hide();

   });

   function viewElementProperties(id)
      {
         var processId;

         for (k = 0; k < specializations.length; k++)
         {

            if (id == specializations[k].id)
            {
               predecessor = specializations[k].predecessor;
               successor = specializations[k].successor;

               $("#td_predecessor1").html(predecessor);
               $("#td_successor1").html(successor);
            }
         }
         for (i = 0; i < chevronProperties.length; i++)
         {

            if (id == chevronProperties[i].id)
            {

               name = chevronProperties[i].name;
               $("#td_name1").html(name);
               processModel = chevronProperties[i].process;

               if (assets.length !== 0)
               {

                  for (k = 0; k < assets.length; k++)
                  {
                     for (var j in assets.data)
                     {
                        if (processModel == assets.data[j].name)
                        {

                           processId = assets.data[j].id;

                           $("#td_mod").tokenInput("clear");
                           $("#td_mod").tokenInput("add",
                           {
                              id: processId,
                              name: processModel
                           });
                        }
                     }
                  }
               }

            }
         }
      }
      //set predecessor for a chevron
   function setPredecessor(sourceId,predecessorId)
      {
         var empty="not declared";
         if(sourceId!== empty)
         {
          for (var i = 0; i < chevronProperties.length; i++)
            {
               if (predecessorId == chevronProperties[i].id)
               {
                  predecessorName=chevronProperties[i].name;
               }
            }
         if(predecessorCount==0)  // the first most element's predecessor should be empty
         {
            
            specializations.push({
               id:predecessorId,
               predecessor:empty,
               predecessorId:empty,
               successor:empty,
               successorId:empty
            });

            specializations.push({
               id:sourceId,
               predecessorId:predecessorId,
               predecessor:predecessorName,
               successor:empty,
               successorId:empty
            });
            ++predecessorCount;
         }
       //TO DOOO
       else{
          specializations.push({
           id:sourceId,
           predecessorId:predecessorId,
           predecessor:predecessorName,
           successor:empty,
           successorId:empty 
          });

       }
    }
    }
        
      
      //set successor for a chevron
   function setSuccessor(sourceId,successorId)
   {
      
      if(successorId=="not declared")
      { 
         for(var i=0; i<specializations.length;i++)
     {
       if(sourceId==specializations[i].id)
       {
         specializations[i].successorId=successorId;
         specializations[i].successor= "not declared";
       }
    }
      }
      else{
      for(var k=0; k<chevronProperties.length;k++)
      {
         if(successorId==chevronProperties[k].id)
         {
            successorName=chevronProperties[k].name;
         
      
     for(var i=0; i<specializations.length;i++)
     {
       if(sourceId==specializations[i].id)
       {
         specializations[i].successorId=successorId;
         specializations[i].successor= successorName;
       }
     }
  }
  }
   
}
}
      
      //update edited chevron positions
   function updatePositionsForRelations(element)
      {

         var id = element.find('.chevron-textField').attr('name');
         var xValue = parseInt(element.css("left"), 10);
         var yValue = parseInt(element.css("top"), 10);
         for (i = 0; i < relationPositions.length; i++)
         {
            if (id == relationPositions[i].chevId)
            {
               if (relationPositions[i].xVal != xValue)
               {

                  relationPositions[i].xVal = xValue;
                  positionChanged = true;

               }
            }
         }

      }
      //when element is moved from its initial position update the state values as well
   function updatePositionInState(chevron)
   {
      var tempId = chevron.find('.chevron-textField').attr('name');
      for (i = 0; i < formatting.length; i++)
      {
         if (tempId == formatting[i].chevronId)
         {
            formatting[i].positionX = parseInt(chevron.css("left"), 10);
            formatting[i].positionY = parseInt(chevron.css("top"), 10);
         }
      }
   }
   function clearFields()
   {
      $("#td_predecessor1").html("");
               $("#td_successor1").html("");
               $("#td_name1").html("");
               $("#td_mod").html("");

   }
   function newChevronCreation(x,y)
   {
      newElementPosX=x;
      newElementPosY=y;
      clearFields();
      isNewElement=true;  // new element properties to be added 
      $('#save').css('visibility', 'visible');

   }
   //save content for new element
    $('#save').click(function()
   { 
     // alert('saving' +currentId);
      id= currentId;
      name=$("#td_name1").html();
      process= newElementProcess;
   // alert(name);
  //  alert(process);

      storePropertiesOfChevron(id,name,process);

      saveStateForNewElement(id,name,process,newElementPosX,newElementPosY); // TO DO
      
      setRelationsForNewElement(id,name); //set pre/suc values for new element
     $("#editElementProps").hide();

     isNewElement=false; //let element be viewed

   });

function saveStateForNewElement(id,name,process,x,y) //save state for new element
{
   //alert('in save state');
  // alert(id);
  // alert(name);
  // alert(process);
  // alert(x);

   relationPositions.push(
      {
         chevId: id,
         chevName: name,
         xVal: x,
         yVal: y
      });

    chevrons.push(
         {
            
            chevronId: id,
            chevronName: name,
            processModel: process
         });
         formatting.push(
         {
            chevronId: id,
            positionX: x,
            positionY: y
         });
}

function setRelationsForNewElement(id,name)  
{
   for(i=0;i<specializations.length;i++)
   {
      if(specializations[i].successor=="not declared")
      {
        // alert('found last elm'+specializations[i].id);
         specializations[i].successorId=id;
         specializations[i].successor=name;
        
         newPredecessorId=specializations[i].id;
         for(k=0; k<chevronProperties.length;k++)
         {
            if(newPredecessorId==chevronProperties[k].id)
            {
               newPredecessor=chevronProperties[k].name;
            }
         }
        // newPredecessor=specializations[i].name;
         newSuccessorId="not declared";
         newSuccessor="not declared";
        // alert(newPredecessor);
      }
   }
   specializations.push({
    id:id,
    predecessorId:newPredecessorId,
    predecessor:newPredecessor,
    successorId:newSuccessorId,
    successor:newSuccessor
   });
}
   function chevronClicked()
   {

      $("#editMainProps").hide();
      $("#editElementProps").show();
      $("#td_mod").html("");

      var clickedElement = $(this);
      var id = clickedElement.find('.chevron-textField').attr('name');
     // alert('id when clicked'+id);
      currentId = id;
      //TEST
       if(id==0)  //if a new element is added
       {
           //alert('new elm'+idList.length);
           newId= ++idList.length;
          // alert(newId);
           clickedElement.find('.chevron-textField').attr('name',newId); //set an id for new element
           newChevId= clickedElement.find('.chevron-textField').attr('name');
           currentId=newChevId;
          // alert('before'+newChevId);
           idList.push(newChevId);
            var positionX = parseInt(clickedElement.css("left"), 10);
           var positionY = parseInt(clickedElement.css("top"), 10);
           //alert(positionY);
           newChevronCreation(positionX,positionY); // clear content and show save button
       }


         /////
         if(!isNewElement)
         {
            $('#save').css('visibility', 'hidden');
          getProcessForChevron(id);
          viewElementProperties(id); //view element details for chevron
        }

      jsPlumb.draggable(clickedElement,
      {
         containment: 'parent',
         stop: function(event)
         {
            stateDragged = true;
            updatePositionInState(clickedElement); //alter initial saved state
            updatePositionsForRelations(clickedElement); // update position changes for suc/pre relationships
            updateRelations(clickedElement);

         }
      });

      

      clickedElement.find('.chevron-textField').keyup(function(e)
      {

         if (e.keyCode === 16)
         { //when user press shift key

            var nameOfCurrentTextBox = $(this).val();

            $("#td_name1").html(nameOfCurrentTextBox);
 
            if(!isNewElement){  // If exisiting element
            updateNameInState(id, nameOfCurrentTextBox);

            updateEditedName(id, nameOfCurrentTextBox);
            editName = true;
            updateRelations(clickedElement);
          }

         }

      });
    
   }

   //update successor/predecessor for moved chevrons
   function updateRelations(element)
   {
      if (editName) // if the name of an element changed
      {

         currentId = element.find('.chevron-textField').attr('name'); //current element id
         var currentName = element.find('.chevron-textField').val(); //current element's edited name

         for (count = 0; count < specializations.length; count++)
         {
            if (currentId == specializations[count].predecessorId) //find current element in specializations predecessor
            {
               specializations[count].predecessor = currentName;
            }
            if (currentId == specializations[count].successorId) // find cutrrent element in specializations successor
            {
               specializations[count].successor = currentName;
            }

         }
         editName = false;
      }

      if (positionChanged) // position changed
      {

         currentId = element.find('.chevron-textField').attr('name');
         var currentName = element.find('.chevron-textField').val();

         var currentX = parseInt(element.css("left"), 10);
         for (i = 0; i < specializations.length; i++)
         {
            if (currentId == specializations[i].id) //if current element
            {

               // current object's old pre/suc values
               oldPreId = specializations[i].predecessorId; //previous predecessor
               oldPredecessor = specializations[i].predecessor;
               oldSucId = specializations[i].successorId; //previous successor
               oldSuccessor = specializations[i].successor;

               for (k = 0; k < relationPositions.length; k++)
               {

                  if (oldSucId == relationPositions[k].chevId)
                  {

                     oldX = relationPositions[k].xVal;

                     if (oldX < currentX) // current element is dragged forward
                     {

                        specializations[i].predecessorId = oldSucId; //set new predecessor
                        specializations[i].predecessor = oldSuccessor;

                        for (j = 0; j < specializations.length; j++) //set values for old successor element
                        {

                           if (oldSucId == specializations[j].id)

                           {

                              specializations[i].successorId = specializations[j].successorId;
                              specializations[i].successor = specializations[j].successor; //set new successor
                              oldSuccessorNextId = specializations[j].successorId;

                              specializations[j].successorId = currentId; //set  new succssor for previous successor
                              specializations[j].successor = currentName;
                              specializations[j].predecessorId = oldPreId;
                              specializations[j].predecessor = oldPredecessor; //set new predecessor for previous successor

                              if (oldPreId == "not declared")
                              {

                                 for (t = 0; specializations.length; t++)
                                 {

                                    if (oldSuccessorNextId == specializations[t].id)
                                    {
                                       specializations[t].predecessorId = currentId;
                                       specializations[t].predecessor = currentName;

                                       positionChanged = false; // this method call is done
                                       relationsReset = true; // should not set the successor again
                                    }
                                 }

                              }
                           }

                        }
                        for (r = 0; r < specializations.length; r++) //set values for old predecessor element
                        {

                           if (oldPreId == specializations[r].id)
                           {

                              specializations[r].successorId = specializations[i].predecessorId;
                              specializations[r].successor = specializations[i].predecessor; //set new predecessor for previous predecessor

                           }
                           //add flag
                           positionChanged = false; // this method call is done
                           relationsReset = true; // should not set the successor again

                        }

                     } //if
                  }
               }
            }
         }
      }
   }

   function updateNameInState(id, editedName)
   {
      for (i = 0; i < chevrons.length; i++)
      {
         if (id == chevrons[i].chevronId)
         {
            chevrons[i].chevronName = editedName;
         }
      }
   }

   function updateEditedName(id, editedName)
   {
      for (i = 0; i < chevronProperties.length; i++)
      {
         if (id == chevronProperties[i].id)
         {
            chevronProperties[i].name = editedName;
         }
      }
   }

   function replaceProcessText(processName)
   {
      $.ajax(
      {
         type: "GET",
         url: "../apis/processes?type=process",
         data:
         {
            q: processName
         },
         success: function(Result)
         {

            setIdOfProcess(Result, processName);
         }
      });
   }

   function setIdOfProcess(results, processName)
   {

      var obj = eval("(" + results + ")");
      for (var i in obj)
      {
         var item = obj[i];

         processId = item.id;

      }
      $("#td_mod").tokenInput("clear");
      $("#td_mod").tokenInput("add",
      {
         id: processId,
         name: processName
      });
   }

   function editProcessProperties(newProcess)
      {

         for (i = 0; i < chevronProperties.length; i++)
         {
            if (currentId == chevronProperties[i].id)
            {

               chevronProperties[i].process = newProcess;

               chevId = chevronProperties[i].id;
               viewElementProperties(chevId);
            }
         }
      }
      //when process name is changed, update chevron state as well
   function updateProcessInState(newProcess)
   {

      for (i = 0; i < chevrons.length; i++)
      {
         if (currentId == chevrons[i].chevronId)
         {
            chevrons[i].processModel = newProcess;
            
         }
      }
   }
   $(function()
   {
       //Drag icon from toolbox and place on canvas

      $(".chevron-toolbox").draggable(
      {
         helper: 'clone',
         cursor: 'move',
         tolerance: 'fit',
         revert: true
      });
      $("#canvasArea").droppable(
      {
         accept: '.chevron-toolbox',
         activeClass: "canvasArea",
         containment: 'canvasArea',

         drop: function(e, ui)
         {
            var newId=0;
            x = ui.helper.clone();
            ui.helper.remove();
            $(x).removeAttr("class");
            $(x).addClass("chevron");

             var textField = $('<textArea>').attr(
         {
            name: newId
         }).addClass("chevron-textField");
             x.append(textField);

            x.appendTo('#canvasArea'); // main container
            x.click(chevronClicked);
         }

      });
     

      var url = "../apis/processes?type=process";
      $("#td_mod").tokenInput(url,
      {
         preventDuplicates: true,
         theme: "facebook",

         onResult: function(results)
         {

            $.each(results, function()
            {

               for (var i in results)
               {
                  var item = results[i];

                  assets.data.push(
                  {

                     "path": item.path,
                     "id": item.id,
                     "name": item.attributes.overview_name
                  });

               };
            });
            return assets.data;

            console.log('' + JSON.stringify(arguments));
         },
         onAdd: function(item)
         {

            var name = item.name;
            if(isNewElement)
            {
              newElementProcess=name;
            }
            else{
            editProcessProperties(name);
            updateProcessInState(name);
            }

         },
         tokenFormatter: function(item)
         {
            return "<li><a href =/publisher/asts/process/details/" + item.id + ">" + item.name + " </a></li>" //URL CHANGE
         }
      });

   });

});