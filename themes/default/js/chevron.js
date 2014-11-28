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

   var mainProcess = []; // store properties of diagram and elements
   var viewForName = []; // names of chevron views 
   var mainProcessName; // name of diagram view
   var iconId; //holds the current id of chevron
   var nameForThisElement; //to map the text box value to property field value
   var elementsOnCanvas = []; // holds all ids of dropped elements on canvas
   var count = 0; // element id incrementer
   var specializations = []; // to store pre/succssor relationships for an element
   var chevrons = []; // save chevron elements on canvas
   var formatting = []; //save chevron postioning on canvas
   var stateDragged = false; //check for postion change 
   var validElementIds = []; // to hold already saved element ids (to check for edits)
   var editName = false; //if the element name is edited
   var existingElement = false; // add edit functionality if element is already created
   var chevronPositions = []; // store position updates of chevrons
   var positionChanged = false; // user changed order of element positions
   var relationsReset = false; // predecessor/successor relationships were updated

   //on form submit save xml content of the drawn canvas
   $('#btn-create-asset').click(function(e)
   {
      saveDiagram();
   });

   // Save properties of elements
   $('#saveElms').click(function(e)
   {

      createElementProperties(mainProcess);
      $("#elementProps").hide();
      
   });
   //Save properties of main process
   $('#save').click(function()
   {

      createMainProperties(mainProcess);
      $("#fullProps").hide();

   });
   // On Canvas doubleclick show create/view page
   $('#DropArea').dblclick(function(e)
   {
      if (mainProcess.length !== 0 && mainProcessName) // propererties for main diagram added
      {
         $("#fullProps").show();
         viewPropertyList(mainProcess);
         $("#elementProps").hide();
      }
      else
      {

         $("#fullProps").show();
         $("#elementProps").hide();
      }
   });
   //Display added properties for a view
   function viewElementProperties(arr1, arr2, name)
      {

         for (i = 0; i < arr1.length; i++)
         {
            if (arr1[i].name == name)
            {

               var checkId = arr1[i].id;
               $("#properties_ename").val(arr1[i].name);

               $("#properties_Associated_process_emodels").tokenInput("clear");
               $("#properties_Associated_process_emodels").tokenInput("add",
               {
                  id: "1",
                  name: arr1[i].models
               });

               if (arr2.length > 0)
               {

                  if (arr1[0].description)
                  { // if a main process is added

                     $("#properties_epredecessors").val(arr2[i - 1].predecessor);
                     $("#properties_esuccessors").val(arr2[i - 1].successor);
                  }
                  else if (!arr1[0].description)
                  {
                     $("#properties_epredecessors").val(arr2[i].predecessor);
                     $("#properties_esuccessors").val(arr2[i].successor);
                  }
               }

            }
         }

      }
      //Add properties for elements
   function createElementProperties(arr1)
      {
         var id = iconId; // get the current id of the element

         var name = $("#properties_ename").val();

         var models = $("#properties_Associated_process_emodels").val();

         for (i = 0; i < arr1.length; i++)
         {

            if (id == arr1[i].id)
            { // its an edit of a record

               arr1[i].name = name;

               arr1[i].models = models;

               existingElement = true;
            }
         }

         if (($.inArray(name, viewForName) == -1) && !existingElement)
         { // its a new record

            arr1.push(
            {
               id: id,
               name: name,
               models: models
            });
            var viewName = name;
            viewForName.push(viewName);
         }
      }
      // Add properties for main process
   function createMainProperties(arr1)
      {

         var mainId = "mainId";
         var description = $("textarea#overview_description").val();

         var name = $("#overview_name").val();
         var owner = $("#properties_owner").val();
         var predecessor = $("#properties_predecessors").val();
         var successor = $("#properties_successors").val();

         if (mainProcessName) //its an edit of record
         {
            for (i = 0; i < arr1.length; i++)
            {
               if (arr1[i].name == mainProcessName)
               {
                  arr1[i].name = name;
                  arr1[i].owner = owner;
                  arr1[i].predecessor = predecessor;
                  arr1[i].successor = successor;
                  arr1[i].description = description;
               }
            }
         }
         else
         {
            arr1.push(
            {
               id: mainId,
               name: name,
               owner: owner,
               predecessor: predecessor,
               successor: successor,
               description: description
            });
            mainProcessName = name;
         }
      }
      // Display added properties for main process
   function viewPropertyList(arr1)
      {
         for (i = 0; i < arr1.length; i++)
         {
            if (arr1[i].description)
            {
               $("#overview_name").val(arr1[i].name);
               $("#properties_owner").val(arr1[i].owner);
               $("#properties_predecessors").val(arr1[i].predecessor);
               $("#properties_successors").val(arr1[i].successor);
               $("textarea#overview_description").val(arr1[i].description);
            }
         }
      }
      // Save canvas elements and positions
   var saveState = function(chevron)
   {

      var processModel = "not declared"; //state is first saved when element is dropped to canvas
      var chevronId1 = chevron.find('.text-edit').attr('name');
      var chevronName = chevron.find(".text-edit").val();
      var positionX = parseInt(chevron.css("left"), 10);
      var positionY = parseInt(chevron.css("top"), 10);

      if (stateDragged || editName) // if position changed. update
      {

         for (var i = 0; i < chevrons.length; i++)
         {
            if (chevrons[i].chevronId == chevronId1) // if its an existing element
            {
               for (j = 0; j < mainProcess.length; j++) // get process model for chevron
               {
                  if (mainProcess[j].id == chevronId1)
                  {
                     processModel = mainProcess[j].models;
                  }
               }
               chevrons[i].processModel = processModel;
               if (stateDragged)
               {

                  formatting[i].positionX = positionX;
                  formatting[i].positionY = positionY;

               }
               else
               {

                  chevrons[i].chevronName = chevronName;
               }
            }
         }
         stateDragged = false;
      }
      else
      {
         chevrons.push(
         {
            diagramName: mainProcessName,
            chevronId: chevronId1,
            chevronName: chevronName,
            processModel: processModel
         });
         formatting.push(
         {
            chevronId: chevronId1,
            positionX: positionX,
            positionY: positionY
         });
      }
   }

   function setChevronPositions(element)
   {
      var name = "empty";
      var id = element.find('.text-edit').attr('name');
      var xValue = parseInt(element.css("left"), 10);
      var yValue = parseInt(element.css("top"), 10);

      chevronPositions.push(
      {
         chevId: id,
         chevName: name,
         xVal: xValue,
         yVal: yValue
      });

   }

   function updateChevronPositions(element)
      {

         var id = element.find('.text-edit').attr('name');
         var xValue = parseInt(element.css("left"), 10);
         var yValue = parseInt(element.css("top"), 10);
         for (i = 0; i < chevronPositions.length; i++)
         {
            if (id == chevronPositions[i].chevId)
            {
               if (chevronPositions[i].xVal != xValue)
               {
                  chevronPositions[i].xVal = xValue;
                  chevronPositions[i].yVal = yValue;
                  chevronPositions[i].chevName = element.find('.text-edit').val();

                  positionChanged = true;
               }
            }
         }

      }
      // If chevron element is clicked 
   function divClicked()
      {

         var isFirstElement = false;
         var clickedElement = $(this);

         clickedElement.find('.text-edit').css('visibility', 'visible');
         var testId = clickedElement.find('.text-edit').attr('name');
         var testName = clickedElement.find('.text-edit').text();

         var id = testId;

         iconId = id; //setting current id of the element
         if (id == 0 && elementsOnCanvas.length == 0) //first element
         {
            isFirstElement = true;
            id = ++count;
            elementsOnCanvas.push(id);

            clickedElement.find('.text-edit').attr('name', id);
            setChevronPositions(clickedElement); //save position details for chevron
         }
         if (id == 0 && elementsOnCanvas.length !== 0) //not first element 
         {

            var lastLocation = elementsOnCanvas.length;

            var temp = elementsOnCanvas[lastLocation - 1];

            id = temp + 1;
            elementsOnCanvas.push(id);
            clickedElement.find('.text-edit').attr('name', id);
            setChevronPositions(clickedElement);
         }

         // make element draggable      
         jsPlumb.draggable(clickedElement,
         {
            containment: 'parent',
            stop: function(event)
            {
               stateDragged = true;
               saveState(clickedElement);
               updateChevronPositions(clickedElement); // update position changes
               updateRelations(clickedElement);

            }
         });
         clickedElement.find('.text-edit').position(
         { // position text box in the center of element
            my: "center",
            at: "center",
            of: clickedElement
         });
         var textValue = clickedElement.find('.text-edit').val();

         if ($.inArray(textValue, viewForName) > -1) // if properties already added for element

         //show the view with values
         {
            if (!relationsReset)
            {
               setSuccessor(id);
            }
            $("#elementProps").show();
            viewElementProperties(mainProcess, specializations, textValue);
            $("#fullProps").hide();
         }
         else
         {

            clearAllFields();
            $("#fullProps").hide();

            $("#elementProps").show();
            clickedElement.find('.text-edit').focus();

            clickedElement.find('.text-edit').keyup(function(e)
            {
               clickedElement.find('.text-edit').css('background-color', 'white');
               if (e.keyCode === 16) //if 32 user is done editing (shift key) //CHANGE
               {
                  var tempId = clickedElement.find('.text-edit').attr('name');
                  iconId = tempId;
                  if ($.inArray(tempId, validElementIds) > -1) // editing the name
                  {

                     var tempName = ($(this).val());
                     viewForName.push($(this).val());
                     editName = true;
                     updateRelations(clickedElement); //update predecessor/successor values

                     saveState(clickedElement);
                  }
                  else
                  {
                     validElementIds.push(tempId);
                  }
                  clickedElement.find('.text-edit').css('background-color', '#FFCC33');
                  var nameOfCurrentTextBox = $(this).val();
                  $("#properties_ename").val(nameOfCurrentTextBox);
                  setPredecessor(tempId);
                  nameForThisElement = $("#properties_ename").val();
                  saveState(clickedElement);
               }
            });
         }
      }
      // clear field values 
   function clearAllFields()
   {

      $("#properties_ename").val("");
      $("#properties_eowner").val("");
      $("#properties_epredecessors").val("");
      $("#properties_esuccessors").val("");
      $("#properties_Associated_process_emodels").val("");
   }

   //set successor for the element
   function setSuccessor(id)
   {
      var tempId = id;

      var nextId = ++id;

      if (id !== "mainId")
      { // not the main process

         for (var i = 0; i < mainProcess.length; i++)
         {
            var next;

            if (mainProcess[i].id == nextId)
            {
               next = mainProcess[i].name;

               for (var k = 0; k < specializations.length; k++)
               {

                  if (specializations[k].id == tempId)
                  {

                     specializations[k].successor = next;
                     specializations[k].successorId = nextId;

                  }
               }
            }
         }
      }
   }

   //update suc/pre relations 
   function updateRelations(element)
   {
      if (editName) // if the name of an element changed
      {
         currentId = element.find('.text-edit').attr('name'); //current element id
         var currentName = element.find('.text-edit').val(); //current element's edited name

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

      }

      if (positionChanged) // position changed
      {

         currentId = element.find('.text-edit').attr('name');
         var currentName = element.find('.text-edit').val();

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

               for (k = 0; k < chevronPositions.length; k++)
               {

                  if (oldSucId == chevronPositions[k].chevId)
                  {

                     oldX = chevronPositions[k].xVal;

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
                              specializations[j].successorId = currentId; //set  new succssor for previous successor
                              specializations[j].successor = currentName;
                              specializations[j].predecessorId = oldPreId;
                              specializations[j].predecessor = oldPredecessor; //set new predecessor for previous successor
                              oldSuccessorNextId = specializations[j].successorId;

                              if (oldPreId == "not declared") //current is the first most element
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
                           if (oldPreId == specializations[r].id) // current is placed between two elements
                           {
                              specializations[r].successorId = specializations[i].predecessorId;
                              specializations[r].successor = specializations[i].predecessor; //set new predecessor for previous predecessor

                           }

                        }

                        //add flag
                        positionChanged = false; // this method call is done
                        relationsReset = true; // should not set the successor again
                     }
                  }
               }

            }
         }

      }
   }

   // add predecessor for element
   function setPredecessor(id)
   {

      var empty = "not declared";
      if (!editName)
      {
         if (id !== '1') // not first element on canvas
         {
            var previous;
            for (var i = 0; i < mainProcess.length; i++)
            {
               if (mainProcess[i].id == id - 1)
               {
                  previousId = mainProcess[i].id;
                  previous = mainProcess[i].name;

                  specializations.push(
                  {
                     id: id,
                     predecessor: previous,
                     predecessorId: previousId,
                     successor: empty,
                     successorId: empty
                  });
               }
            }
         }
         else
         {
            specializations.push(
            {
               id: id,
               predecessor: empty,
               predecessorId: empty,
               successor: empty,
               successorId: empty
            });
         }
      }
   }

   //at page load
   jsPlumb.setContainer($('#DropArea'));
   $("#fullProps").show();
   $("#elementProps").hide();

   //Save the created diagram in XML format
   function saveDiagram()
   {

      var root = {};
      var xmlSection1 = [];
      var xmlSection2 = [];
      var xmlSection = [];
      var elements = [];
      var connects = [];
      var orders = [];

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

      .done(function(result)
      {
         
      });

   }

   $(function()
   {

      $("#fullProps").tabs(); //show main process table
      $("#elementProps").tabs(); //show element table

      var url = "../chevron/apis/processes?type=process";

      $("#properties_Associated_process_emodels").tokenInput(url,
      {
         preventDuplicates: true,
         theme: "facebook",

         onResult: function(results)
         {
            var assets = {
               data: []
            }
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

            $("#properties_Associated_process_emodels").val(name);
         },
         tokenFormatter: function(item)
         {
            return "<li><a href =../process/details/" + item.id + ">" + item.name + " </a></li>"
         }
      });

      //Drag icon from toolbox and place on canvas

      $(".chevron-toolbox").draggable(
      {
         helper: 'clone',
         cursor: 'move',
         tolerance: 'fit',
         revert: true
      });
      $("#DropArea").droppable(
      {
         accept: '.chevron-toolbox',
         activeClass: "drop-area",
         containment: 'DropArea',

         drop: function(e, ui)
         {
            x = ui.helper.clone();
            ui.helper.remove();
            $(x).removeAttr("class");
            $(x).addClass("chevron");
            x.appendTo('#DropArea'); // main container
            x.click(divClicked);
         }
      });
   });
});