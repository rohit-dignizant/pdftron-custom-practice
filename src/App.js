import React, { useRef, useEffect, useState } from 'react';
import WebViewer from '@pdftron/webviewer';
import './App.css';
import { TOOLNAME } from "./constantList"

const App = () => {
  const viewer = useRef(null);
  const [webViewerInstance, setWebViewerInstance] = useState(null);


  // if using a class, equivalent of componentDidMount 
  useEffect(() => {
    WebViewer(
      {
        path: '/webviewer/lib',
        initialDoc: '/files/pdf/PDFTRON_about.pdf',
      },
      viewer.current,
    ).then((instance) => {
      setWebViewerInstance(instance);
      const { documentViewer, Annotations, annotationManager, Tools, Math:instanceMath  } = instance.Core;

      class TriangleAnnotation extends Annotations.CustomAnnotation {
        constructor() {
          super('triangle'); // provide the custom XFDF element name
          this.Subject = 'Triangle';
          this.selectionModel = TriangleSelectionModel;


          // ------------------------------------
          // Making customizable vertices
          // ------------------------------------
          // create simple property
          this.vertices = [];
          const numVertices = 3;
          // initialize points
          for (let i = 0; i < numVertices; ++i) {
            this.vertices.push(new instanceMath.Point());
          }          
        }

        draw(ctx, pageMatrix) {
          // the setStyles function is a function on markup annotations that sets up
          // certain properties for us on the canvas for the annotation's stroke thickness.
          this.setStyles(ctx, pageMatrix);
      
          // first we need to translate to the annotation's x/y coordinates so that it's
          // drawn in the correct location
          /*ctx.translate(this.X, this.Y);
          ctx.beginPath();
          ctx.moveTo(this.Width / 2, 0);
          ctx.lineTo(this.Width, this.Height);
          ctx.lineTo(0, this.Height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();*/

          // draw the triangle lines using vertices from our list
          ctx.beginPath();
          ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
          ctx.lineTo(this.vertices[1].x, this.vertices[1].y);
          ctx.lineTo(this.vertices[2].x, this.vertices[2].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();


        }

        resize(rect) {
          // this function is only called when the annotation is dragged
          // since we handle the case where the control handles move
          const annotRect = this.getRect();
          // determine how much change in each dimension
          const deltaX = rect.x1 - annotRect.x1;
          const deltaY = rect.y1 - annotRect.y1;
      
          // shift the vertices by the amount the rect has shifted
          this.vertices = this.vertices.map((vertex) => {
            vertex.translate(deltaX, deltaY);
            return vertex;
          });
          this.setRect(rect);
        }

        serialize(element, pageMatrix) {
          // save our custom property into the custom data
          this.setCustomData('vertices', this.vertices);
          // perform regular serialization on other properties
          const el = super.serialize(element, pageMatrix);
          // create an attribute to save the vertices list
          el.setAttribute('vertices', Annotations.XFDFUtils.serializePointArray(this.vertices, pageMatrix));
          return el;
        }

        deserialize(element, pageMatrix) {
          // perform regular deserialization for other properties
          super.deserialize(element, pageMatrix);
          // read our custom property out from custom data
          const storedVertices = this.getCustomData('vertices');
          // set the property after initializing the data as points
          this.vertices = storedVertices.map(v => new instanceMath.Point(v.x, v.y));


          // read it back as points from the attribute
          this.vertices = Annotations.XFDFUtils.deserializePointArray(element.getAttribute('vertices'), pageMatrix);
        }

        // custom property
        get CustomID() {
          // attempt to get a customId value from the map
          return this.SerializedData.customId;
        }

        set CustomID(id) {
          // set a customId value from the map
          this.SerializedData.customId = id;
        }
      }
      // this is necessary to set the elementName before instantiation
      TriangleAnnotation.prototype.elementName = 'triangle';
      TriangleAnnotation.OutputImagePadding = 25; // adds 25 pixels all around
      TriangleAnnotation.QualityScale = 2; // doubles the resolution at the cost of memory
      TriangleAnnotation.SerializationType = Annotations.CustomAnnotation.SerializationTypes.CUSTOM; // use custom XFDF

      // register the annotation type so that it can be saved to XFDF files
      annotationManager.registerAnnotationType(TriangleAnnotation.prototype.elementName, TriangleAnnotation);

      
      
      /// ------------Create Custom Button---------------------
      // ------------------------------------------------------

      // To allow a user to actually add the annotation to a document, we'll need to create a tool so that the user can use to create our annotation through the UI.
      class TriangleCreateTool extends Tools.GenericAnnotationCreateTool {
        constructor(documentViewer) {
          // TriangleAnnotation is the class (function) for our annotation we defined previously
          super(documentViewer, TriangleAnnotation);
        }


        // ----------------------------------------------
        // Then for the tool we'll override the mouseMove function to set the vertices on creation:
        mouseMove(e) {
          // call the parent mouseMove first
          super.mouseMove(e);
          if (this.annotation) {
            // set the vertices relative to the annotation width and height
            this.annotation.vertices[0].x = this.annotation.X + this.annotation.Width / 2;
            this.annotation.vertices[0].y = this.annotation.Y;
            this.annotation.vertices[1].x = this.annotation.X + this.annotation.Width;
            this.annotation.vertices[1].y = this.annotation.Y + this.annotation.Height;
            this.annotation.vertices[2].x = this.annotation.X;
            this.annotation.vertices[2].y = this.annotation.Y + this.annotation.Height;
      
            // update the annotation appearance
            annotationManager.redrawAnnotation(this.annotation);
          }
        }


        // ----------------------------------------------
        serialize(element, pageMatrix) {
          // save our custom property into the custom data
          this.setCustomData('vertices', this.vertices);
          // perform regular serialization on other properties
          const el = super.serialize(element, pageMatrix);
          return el;
        }
        deserialize(element, pageMatrix) {
          // perform regular deserialization for other properties
          super.deserialize(element, pageMatrix);
          // read our custom property out from custom data
          const storedVertices = this.getCustomData('vertices');
          // set the property after initializing the data as points
          this.vertices = storedVertices.map(v => new instanceMath.Point(v.x, v.y));
        }

        
      };

      const triangleToolName = 'AnnotationCreateTriangle';
      const triangleTool = new TriangleCreateTool(documentViewer);
      instance.UI.registerTool({
        toolName: triangleToolName,
        toolObject: triangleTool,
        buttonImage: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">' +
          '<path d="M12 7.77L18.39 18H5.61L12 7.77M12 4L2 20h20L12 4z"/>' +
          '<path fill="none" d="M0 0h24v24H0V0z"/>' +
        '</svg>',
        buttonName: 'triangleToolButton',
        tooltip: 'Triangle'
      }, TriangleAnnotation);

      instance.UI.setHeaderItems((header) => {
        header.getHeader('toolbarGroup-Shapes').get('freeHandToolGroupButton').insertBefore({
          type: 'toolButton',
          toolName: triangleToolName
        });
      });

      /// -------------Create Custom Button--------------------
      // ------------------------------------------------------




      // ----------------create the custom selection model and control handles-------
      class TriangleControlHandle extends Annotations.ControlHandle {
        constructor(annotation, index) {
          super();
          this.annotation = annotation;
          // set the index of this control handle so that we know which vertex it corresponds to
          this.index = index;
        }
        // returns a rect that should represent the control handle's position and size
        getDimensions(annotation, selectionBox, zoom) {
          let x = annotation.vertices[this.index].x;
          let y = annotation.vertices[this.index].y;
          // account for zoom level
          const width = Annotations.ControlHandle.handleWidth / zoom;
          const height = Annotations.ControlHandle.handleHeight / zoom;
      
          // adjust for the control handle's own width and height
          x -= width * 0.5;
          y -= height * 0.5;
          return new instanceMath.Rect(x, y, x + width, y + height);
        }
        // this function is called when the control handle is dragged
        move(annotation, deltaX, deltaY, fromPoint, toPoint) {
          annotation.vertices[this.index].x += deltaX;
          annotation.vertices[this.index].y += deltaY;
      
          // recalculate the X, Y, width and height of the annotation
          let minX = Number.MAX_VALUE;
          let maxX = -Number.MAX_VALUE;
          let minY = Number.MAX_VALUE;
          let maxY = -Number.MAX_VALUE;

          for (let i = 0; i < annotation.vertices.length; ++i) {
            const vertex = annotation.vertices[i];
            minX = Math.min(minX, vertex.x);
            maxX = Math.max(maxX, vertex.x);
            minY = Math.min(minY, vertex.y);
            maxY = Math.max(maxY, vertex.y);
          }
      
          const rect = new Annotations.Rect(minX, minY, maxX, maxY);
          annotation.setRect(rect);
          // return true if redraw is needed
          return true;
        }

        //override the control handle's draw function to make them look like triangles as well.
        draw(ctx, annotation, selectionBox, zoom) {
          const dim = this.getDimensions(annotation, selectionBox, zoom);
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.moveTo(dim.x1 + (dim.getWidth() / 2), dim.y1);
          ctx.lineTo(dim.x1 + dim.getWidth(), dim.y1 + dim.getHeight());
          ctx.lineTo(dim.x1, dim.y1 + dim.getHeight());
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        }
      }
      // ----------------create the custom selection model and control handles-------


      // ------------selection model creates the necessary control handles------------
      class TriangleSelectionModel extends Annotations.SelectionModel {
        constructor(annotation, canModify) {
          super(annotation, canModify);
          if (canModify) {
            const controlHandles = this.getControlHandles();
            // pass the vertex index to each control handle
            controlHandles.push(new TriangleControlHandle(annotation, 0));
            controlHandles.push(new TriangleControlHandle(annotation, 1));
            controlHandles.push(new TriangleControlHandle(annotation, 2));
          }
        }


        // changes how we draw the selection outline
        drawSelectionOutline(ctx, annotation, zoom) {
          // adjust for zoom
          if (typeof zoom !== 'undefined') {
            ctx.lineWidth = Annotations.SelectionModel.selectionOutlineThickness / zoom;
          } else {
            ctx.lineWidth = Annotations.SelectionModel.selectionOutlineThickness;
          }

          // changes the selection outline color if the user doesn't have permission to modify this annotation
          if (this.canModify()) {
            ctx.strokeStyle = Annotations.SelectionModel.defaultSelectionOutlineColor.toString();
          } else {
            ctx.strokeStyle = Annotations.SelectionModel.defaultNoPermissionSelectionOutlineColor.toString();
          }

          ctx.beginPath();
          ctx.moveTo(annotation.vertices[0].x, annotation.vertices[0].y);
          ctx.lineTo(annotation.vertices[1].x, annotation.vertices[1].y);
          ctx.lineTo(annotation.vertices[2].x, annotation.vertices[2].y);
          ctx.closePath();
          ctx.stroke();

          // draw a dashed line around the triangle
          const dashUnit = Annotations.SelectionModel.selectionOutlineDashSize / zoom;
          const sequence = [dashUnit, dashUnit];
          ctx.setLineDash(sequence);
          ctx.strokeStyle = 'rgb(255, 255, 255)';
          ctx.stroke();
        }
        // change the selection testing to match the shape of the triangle
        testSelection(annotation, x, y, pageMatrix) {
          // the canvas visibility test will only select the annotation
          // if a user clicks exactly on it as opposed to the rectangular bounding box
          return Annotations.SelectionAlgorithm.canvasVisibilityTest(annotation, x, y, pageMatrix);
        }



      }


    
    });
  }, []);

  const setActiveTool = (tool) => {
    webViewerInstance.setToolMode(tool);
  }

  const setFitMode = (fitBy) => {
    let fitMode = fitBy === "page" ? webViewerInstance.FitMode.FitPage : webViewerInstance.FitMode.FitWidth;
    webViewerInstance.setFitMode(fitMode);
  }

  return (
    <div className="App">
      <div className="header">React sample</div>
      <div className="toolbar">
          <span onClick={()=> setActiveTool(TOOLNAME.EDIT)}>
            Select
          </span>

          <span onClick={()=> setActiveTool(TOOLNAME.PAN)}>
            PAN
          </span>

          <span onClick={()=> setActiveTool("AnnotationCreateTriangle")}>
            Triangle
          </span>

          <span onClick={()=> setActiveTool(TOOLNAME.RECTANGLE)}>
            Rectangle
          </span>

          <span onClick={()=> setActiveTool(TOOLNAME.POLYGON)}>
            Polygon
          </span>

          <span onClick={()=> setActiveTool(TOOLNAME.ELLIPSE)}>
            Ellipse
          </span>

          <span onClick={()=> setActiveTool(TOOLNAME.POLYLINE)}>
            POLYLINE
          </span>

          <span onClick={()=> setActiveTool(TOOLNAME.FREEHAND)}>
            FREEHAND
          </span>

          <span onClick={()=> setFitMode("page")}>
            Fit To Page
          </span>

          <span onClick={()=> setFitMode("width")}>
            Fit To Width
          </span>
      </div>
      <div className="webviewer" ref={viewer}></div>
    </div>
  );
};

export default App;
