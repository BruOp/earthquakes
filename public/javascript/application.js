$(document).ready(function() {

  // See: http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
  var earthquakes;
  $.ajax({
    url: 'http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    dataType: 'JSON'})
  .done(function(object){
    earthquakes = object.features;
  }).then(function(){
    
    var degrees = 180 / Math.PI,
      ratio = window.devicePixelRatio || 1,
      width = 960,
      height = 800,
      p = ratio;
    
    function makeCircle(coordinates, radius) {
      pointsArr = new Array(21)
      for (var n = 0; n < 21; n++) {
        theta = - 0.1 * Math.PI * n;
        var longtitude = (radius * (coordinates[0] + Math.cos(theta))) / Math.cos(radius * coordinates[1] / degrees);
        var latitude = radius * (coordinates[1] + Math.sin(theta));
        pointsArr[n] = [longtitude, latitude];
      }
      return pointsArr
    }

    _.each(earthquakes, function(earthquake){
      earthquake.origin = earthquake.geometry.coordinates
      earthquake.geometry.coordinates = [makeCircle(earthquake.geometry.coordinates, earthquake.properties.mag/2)];
      earthquake.geometry.type = "Polygon";
    });
    console.log(earthquakes[0]);

    var myProjection = d3.geo.orthographic()
      .rotate([0, -30])
      .scale(height / 2 - 1)
      .translate([width / 2, height / 2])
      .clipExtent([[-p, -p], [width + p, height + p]])
      .precision(.5);

    var canvas = d3.select("#map").append("canvas")
      .attr("width", width * ratio)
      .attr("height", height * ratio)
      .style("width", width + "px")
      .style("height", height + "px");

    var c = canvas.node().getContext("2d");

    var path = d3.geo.path()
      .projection(myProjection)
      .context(roundRatioContext(c));

    var northUp = d3.select("#north-up").on("change", function() { northUp = this.checked; }).property("checked");

    d3.json("../world-110m.json", function(error, world) {


      var globe = {type: "Sphere"},
        graticule = d3.geo.graticule()(),
        land = topojson.feature(world, world.objects.land),
        borders = topojson.mesh(world, world.objects.countries),
        countries = d3.shuffle(topojson.feature(world, world.objects.countries).features),
        i = -1,
        i0 = i;

      c.font = "300px Arial"
      var zoom = d3.geo.zoom()
        .projection(myProjection)
        .duration(function(S) { return 2000 * Math.sqrt(S); }) // assume ease="quad-in-out"
        .scaleExtent([height / 2 - 1, Infinity])
        .on("zoom", function() {
          myProjection.clipAngle(Math.asin(Math.min(1, .5 * Math.sqrt(width * width + height * height) / myProjection.scale())) * degrees);
          c.clearRect(0, 0, width * ratio, height * ratio);
          c.fillStyle = "#80B280", c.beginPath(), path(land), c.fill();
          c.fillStyle = "#f00", c.beginPath(), path(earthquakes[i0]), c.fill();
          c.fillStyle = "#f00", c.beginPath(), path(earthquakes[i]), c.fill();
          c.fillStyle = "#f00", c.beginPath(), path(earthquakes[i+1]), c.fill();
          c.strokeStyle = "#777", c.lineWidth = .25 * ratio, c.beginPath(), path(graticule), c.stroke();
          c.fillStyle = "#000", c.fillText(earthquakes[i+1].properties.mag.toString(), earthquakes[i+1].origin[0], earthquakes[i+1].origin[1]);
          c.strokeStyle = "#000", c.lineWidth = .5 * ratio, c.beginPath(), path(borders), c.stroke();
          c.strokeStyle = "#000", c.lineWidth = .5 * ratio, c.beginPath(), path(globe), c.stroke();
        })
        .on("zoomend", transition);

      console.log(countries[i+1].geometry)
      // console.log(earthquakes[i+1])

      canvas
        .call(zoom)
        .call(zoom.event);

      function transition() {
        zoomBounds(myProjection, earthquakes[i = ((i0 = i) + 1) % earthquakes.length]);
        canvas.transition()
            .ease("quad-in-out")
            .duration(2000) // see https://github.com/mbostock/d3/pull/2045
            .call(zoom.projection(myProjection).event);
      }

      function zoomBounds(projection, o) {
        var centroid = d3.geo.centroid(o),
            clip = projection.clipExtent();

        myProjection
            .rotate(northUp ? [-centroid[0], -centroid[1]] : zoom.rotateTo(centroid))
            .clipExtent(null)
            .scale(1)
            .translate([0, 0]);

        var b = path.bounds(o),
            k = Math.min(1000, .45 / Math.max(Math.max(Math.abs(b[1][0]), Math.abs(b[0][0])) / width, Math.max(Math.abs(b[1][1]), Math.abs(b[0][1])) / height));

        myProjection
            .clipExtent(clip)
            .scale(k)
            .translate([width / 2, height / 2]);
      }
    });

    // Round to integer pixels for speed, and set pixel ratio.
    function roundRatioContext(context) {
      return {
        moveTo: function(x, y) { context.moveTo(Math.round(x * ratio), Math.round(y * ratio)); },
        lineTo: function(x, y) { context.lineTo(Math.round(x * ratio), Math.round(y * ratio)); },
        closePath: function() { context.closePath(); }
      };
    }
  });


});
