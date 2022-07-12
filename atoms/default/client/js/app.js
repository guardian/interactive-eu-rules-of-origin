import { Map , Marker} from 'maplibre-gl';
import ScrollyTeller from "shared/js/scrollyteller"
import style from 'assets/gm-light.json'
import route from 'assets/routes.json'
import ocean from 'assets/ocean-extension.json'
import borders from 'assets/borders.json'
import places from 'assets/places.json'
import { length, along , lineString, nearestPointOnLine, point} from '@turf/turf'
import sugar from 'assets/icons/sugar.html'
import bottle from 'assets/icons/bottle.html'

console.log(new DOMParser().parseFromString(sugar, "text/xml").all[0].innerHTML)

//https://gdn-cdn.s3.amazonaws.com/maptiles/mbtiles/ukraine-sea-eng.mbtiles
//style.sources['vector-tiles'].tiles[0] = 'https://interactive.guim.co.uk/maptiles/mbtiles/ukraine-sea-eng/{z}/{x}/{y}.pbf'
//style.sources['vector-tiles'].tiles[0] = 'http://localhost:8888/20220627-eu-rules-of-origin/assets/tiles/{z}/{x}/{y}.pbf'
//style.sources['vector-tiles'].tiles[0] = 'https://interactive.guim.co.uk/maptiles/pbf-tiles-test/{z}/{x}/{y}.pbf'
style.sources['vector-tiles'].tiles[0] = 'https://interactive.guim.co.uk/maptiles/ireland-uk/{z}/{x}/{y}.pbf'


const scrolly = new ScrollyTeller({
	parent: document.querySelector("#scrolly-1"),
    triggerTop: .5, // percentage from the top of the screen that the trigger should fire
    triggerTopMobile: 0.75,
    transparentUntilActive: false
});

const pixelRatio = window.devicePixelRatio;

const spriteURL = pixelRatio <= 1
?

"https://interactive.guim.co.uk/maptiles/sprites/sprite%402x"
:

"https://interactive.guim.co.uk/maptiles/sprites/sprite"


style.sprite = spriteURL;

const atomEl = document.getElementById('gv-wrapper');

const width = window.innerWidth;
const height = window.innerHeight;

atomEl.style.width = width + "px";
atomEl.style.height = height + "px";


let marker;
let icon;
let animation;
let currentPoint;
let nearestPoint;
let currentCity;

let map = new Map({
	container: 'gv-wrapper', // container id
	style:style,
	center: [-6.895955099531872, 50.075431649016437],
	minZoom: 0,
	maxZoom: 10,
	zoom:7,
	pitch: 40,
	bearing: 0,
	interactive:false
});

let geojson = {
	'type': 'FeatureCollection',
	'features': [
	{
		'type': 'Feature',
		'geometry': {
			'type': 'LineString',
			'coordinates': []
		}
	}
	]
};

map.on('load', () => {

	map.addSource('ocean', {
		'type': 'geojson',
		'data': ocean
	});

	map.addLayer({
		'id': 'ocean',
		'type': 'fill',
		'source': 'ocean',
		'layout': {
		},
		"paint": {
			"fill-color": "#cde2ec"
		}
	});

	map.addSource('borders',{
		'type': 'geojson',
		'data': borders
	})

	map.addLayer({
		'id': 'borders',
		'type': 'line',
		'source': 'borders',
		'layout': {
			'line-cap': 'round',
			'line-join': 'round'
		},
		"paint": {
			'line-color': '#bababa',
			'line-width': 2
		}
	});

	map.addSource('line', {
		'type': 'geojson',
		'data': geojson
	});

	map.addLayer({
		'id': 'line-animation',
		'type': 'line',
		'source': 'line',
		'layout': {
			'line-cap': 'round',
			'line-join': 'round'
		},
		'paint': {
			'line-color': '#c70000',
			'line-width': 5,
			'line-opacity': 1
		}
	});

	map.addSource('places', {
	'type': 'geojson',
	'data': places
	});

	map.addLayer({
	'id': 'labels',
	'type': 'symbol',
	'source': 'places',
	"layout": {
				"text-size": 22,
				"text-font": ["Gdn Text Sans TS3Bold"],
				"text-field": "{name}",
				"text-anchor": "top",
				"text-justify": "center",
				"text-radial-offset": 1,
				"visibility":"none"
			},
	"paint": {
				"text-halo-color": "#FFFFFF",
				"text-halo-width": 1,
				"text-color": "#333333"
			}
	});
	
	marker = new Marker()
	.setLngLat([0,0])
	.addTo(map);

	icon = document.getElementsByClassName('maplibregl-marker')[0]


	map.on('error', (err) => {console.log(err)})

	route.features.forEach((d,i) => {


		let distance = length(d, 'kilometers');

		route.features[i].routePoints = []

		let steps = 100

		for (var j = 0; j < distance; j += distance / steps) {

			let segment = along(lineString(d.geometry.coordinates[0]), j, {units: 'kilometers'})

			route.features[i].routePoints.push(

				[+segment.geometry.coordinates[0], +segment.geometry.coordinates[1]]

			)

		}

		scrolly.addTrigger({num: i+1, do: () => {

			try
			{
				geojson.features[0].geometry.coordinates = []

				let path = route.features.find(f => f.properties.id === i+1);
				let icon = path.properties.icon;

				nearestPoint = nearestPointOnLine(lineString(path.routePoints), point(path.routePoints[path.routePoints.length-1]), {units: 'kilometers'});

				window.cancelAnimationFrame(animation)
				drawLine(path.routePoints, icon)

				currentCity = places.features.find(f => f.properties.name === path.properties.name.split('-')[1]).properties.name

				moveCamera(nearestPoint.geometry.coordinates, 0.5)

				if(i < 3)
				{
					map.setPaintProperty(
					  'line-animation', 
					  'line-color', 
					  '#056DA1'
					);
				}
				else
				{
					map.setPaintProperty(
					  'line-animation', 
					  'line-color', 
					  '#c70000'
					);
				}
			}
			catch(err)
			{
				console.log(i+1,err)
			}
		}})
	})

	scrolly.watchScroll();


})

map.on('zoom', () => {


	
})


const drawLine = (points, mode) => {

	let count = 0;

	console.log(icon)

	function renderLine() {

		geojson.features[0].geometry.coordinates.push(points[count])

		count++ 

		map.getSource('line').setData(geojson);

		marker.setLngLat(points[count-1])

		currentPoint != nearestPoint.geometry.coordinates ? currentPoint = points[count] : currentPoint = nearestPoint.geometry.coordinates

		if(currentPoint[0]===-8.717910276792377 && currentPoint[1]===52.54461617787415){
			mode = 'bottle'
		}

		if(currentPoint[0] === -7.3086989 && currentPoint[1] === 54.99668909999998){
			mode = 'bottle'
		}

		if(mode === 'sugar')
		{
			icon.innerHTML = new DOMParser().parseFromString(sugar, "text/xml").all[0].innerHTML;

		}
		else
		{
			icon.innerHTML = new DOMParser().parseFromString(bottle, "text/xml").all[0].innerHTML;

		}


		if(currentCity === 'Limerick')
		{
			map.setLayoutProperty('labels', 'text-anchor', 'bottom')
			map.setLayoutProperty('labels', 'text-radial-offset', 0)
		}
		else
		{
			map.setLayoutProperty('labels', 'text-anchor', 'top')
			map.setLayoutProperty('labels', 'text-radial-offset', 1)
		}

		if(currentPoint === nearestPoint.geometry.coordinates)
		{

			map.setFilter('labels', ['match', ['get', 'name'], currentCity , true, false])

			map.setLayoutProperty('labels', 'visibility', 'visible')

		}
		else{
			map.setLayoutProperty('labels', 'visibility', 'none')
		}

		if(count < points.length)animation = requestAnimationFrame(renderLine)



	}

	renderLine()

}


const moveCamera = (end, speed) => {


	map.flyTo({
		center: end,
			speed: speed, // make the flying slow
			curve: 1,
			easing: function (t) {
				return t;
			},
			essential: true
		});
	
}
