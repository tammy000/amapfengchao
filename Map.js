$(document).ready(function() {
    //指定地图原点，即在此点开始平铺六边形，这样的好处是不管数据变化，六边形位置不变。
    var origoPoint = [32.041847,118.784288];
    var showLabel = true;//显示标题
    var labelField = "count";//标题字段
    
    
    function makeMapPos(lat,lon) {
        var posX = (lon + 180) / 360;
        var posY = Math.log(Math.tan((1.0 * lat + 90) * Math.PI / 360));
        posY = 0.5 - posY / 2 / Math.PI;
        return [posX,posY];
    }

    function getAlphaColor(color,alpha) {
        if(alpha > 1) {
            alpha = 1;
        }
        var r = parseInt(color.substring(1,3),16);
        var g = parseInt(color.substring(3,5),16);
        var b = parseInt(color.substring(5,7),16);
        return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    };
    var useLevelColor = true;
    $("#changeColor").click(function() {
        useLevelColor = !useLevelColor;
        if(useLevelColor) {
            $("#changeColor").val("颜色切换:等级颜色")
        } else {
            $("#changeColor").val("颜色切换:alpha颜色")
        }
        onRender();
    })
    
    $("#showLabel").click(function() {
        showLabel = !showLabel;
        onRender();
    })


    var colorLevels = ["#89c3eb", "#30c9f7", "#00b4f0", "#2ca9e0", "#008ccc", "#007fcc", "#5383c3", "#3e62ae", "#0168a5", "#08488f", "#402f78", "#233a70", "#0e2350"];
    function getLevelColor(count) {
        if(count >= 0 & count < colorLevels.length) {
            return colorLevels[count];
        }
        if(count > colorLevels.length) {
            return colorLevels[colorLevels.length - 1];
        }
    };

    function getColor(count) {
        if(useLevelColor) {
            return getLevelColor(count);
        }
        return getAlphaColor("#FF0000",count / 10);
    }


    var map,  canvas;

    var store = {};
    var zoom = 10;
    var edgeLen = Math.pow(2, zoom + 8);


    var r = 7.5;
    var len = Math.tan(60.0 / 180 * Math.PI) * r;


    var map = new AMap.Map('container', {
        center: [118.72141151087386,32.183216988847676],
        zoom:10
    });
    map.plugin(['AMap.CustomLayer'], function() {
        canvas = document.createElement('canvas');
        canvas.width = map.getSize().width;
        canvas.height = map.getSize().height;

        var layer = new AMap.CustomLayer(canvas,{
            zIndex: 10000
        });
        layer.render = onRender;
        layer.setMap(map);
    });


    function onRender() {
        var context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);


        var mapCenter = map.getCenter();
        var mapZoom = map.getZoom();
        var rr = Math.pow(2,mapZoom - 10) * r; 
        var size = map.getSize();

        if(canvas.width !== size.width || canvas.height !== size.height) {
            $(canvas).attr("width",size.width).attr("height",size.height);
        }

        var edgeLen = Math.pow(2,mapZoom + 8);
        var mapCenterPos = makeMapPos(mapCenter.lat,mapCenter.lng);

        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "red";
        for(var k in store) {
            var item = store[k];
            var count = item.count;
            context.fillStyle = getColor(count);
            var x = (item._posX - mapCenterPos[0]) * edgeLen + size.width/2;
            var y = (item._posY - mapCenterPos[1]) * edgeLen + size.height/2;
            drawGraph(context, rr, x, y,item);
        }
    }
    function drawGraph(context, r, x, y,item){
        context.translate(x,y);
        context.beginPath();
        for(var i = 0; i < 6; i++){
            var angle = i*60 + 30;
            context.lineTo(Math.cos(angle/ 180 * Math.PI) * r, Math.sin(angle / 180 * Math.PI) * r);
        }
        context.closePath();
        context.fill();
        if(showLabel && item[labelField]) {
            context.fillStyle = "white";
            context.fillText(item[labelField],0,0);
        }
        context.translate(-x,-y);
    }

    function buildData(data) {
        var minX = 10000;
        var minY = 10000;
        for(var i=0;i<data.length;i++) {
            var item = data[i];
            var lon = item["jingd"];
            var lat = item["weid"];
            var mapPos = makeMapPos(lat,lon);
            item._x = mapPos[0];
            item._y = mapPos[1];
            if(item._x < minX) {
                minX = item._x;
            }
            if(item._y < minY) {
                minY = item._y;
            }
        }
        
        var origoMapPos;
        if(origoPoint) {
            origoMapPos = makeMapPos(origoPoint[0],origoPoint[1]);
        } else {
            origoMapPos = [minX,minY];
        }

        var px1 = origoMapPos[0] * edgeLen;
        var py1 = origoMapPos[1] * edgeLen;



        for(var i=0;i<data.length;i++) {
            var item = data[i];
            var y = item._y * edgeLen;
            var posY = (y - py1) / (1.5 * r);
            posY = Math.round(posY);
            var posX;
            if(posY % 2 === 0) {//偶数，第一行
                posX = (item._x * edgeLen - px1) / len;
                posX = Math.round(posX);
                item._posX = (posX * len + px1) / edgeLen;
            } else {//奇数，第二行
                posX = (item._x * edgeLen - px1 - len / 2) / len;
                posX = Math.round(posX);
                item._posX = (posX * len + px1 + len / 2) / edgeLen;
            }
            item._posY = (posY * (1.5 * r) + py1) / edgeLen;

            var id = posX + "_" + posY;
            var sixItem = store[id];
            if(!sixItem) {
                sixItem = {"id":id,"_posX":item._posX,"_posY":item._posY,"count":item.count};
                store[id] = sixItem;
            } else {
                store[id].count += item.count;
            }
        }    
        onRender();
    }    


//    var url = "xunc2016-01.json";
//    $.getJSON(url,{}, function(ret) {
//        buildData(ret);
//    })
//    
    var result = [{"jingd":118.72141151087386,"weid":32.183216988847676,"count":14},{"jingd":118.85137882479235,"weid":32.006047682785216,"count":12},{"jingd":0.015498497079753525,"weid":0.002728458322254793,"count":5},{"jingd":118.79428823646863,"weid":31.972854881252736,"count":7},{"jingd":118.90378877492886,"weid":31.68024932132132,"count":1},{"jingd":118.8814335926406,"weid":32.03359832782058,"count":3},{"jingd":118.85766730445933,"weid":32.01173563731938,"count":2},{"jingd":118.6174948495626,"weid":31.843727182381993,"count":1},{"jingd":118.90668478220843,"weid":31.6345509062945,"count":1},{"jingd":118.90618696548047,"weid":31.65955022146108,"count":1},{"jingd":118.90658632268817,"weid":31.651950498098792,"count":1},{"jingd":118.85986336428238,"weid":32.01243189583764,"count":1},{"jingd":118.8558704257529,"weid":32.00913923315494,"count":1},{"jingd":118.49338298682407,"weid":32.042697494303695,"count":1},{"jingd":118.73480788053295,"weid":31.97267380296441,"count":1},{"jingd":118.9031883652997,"weid":31.675249705686973,"count":1},{"jingd":118.9082841565419,"weid":31.62495104419675,"count":1},{"jingd":118.60048934002528,"weid":31.82532600451773,"count":1},{"jingd":118.77034057671413,"weid":32.26092494476274,"count":1},{"jingd":118.92089841790927,"weid":31.71215111693908,"count":1},{"jingd":118.85696843820207,"weid":32.0099372098441,"count":1},{"jingd":118.85626970082843,"weid":32.00943849278606,"count":1},{"jingd":118.65174367796592,"weid":31.875961858769305,"count":1},{"jingd":118.88273230077509,"weid":32.034496846616904,"count":1},{"jingd":118.72291370580949,"weid":32.18421860891737,"count":1},{"jingd":118.43435669141161,"weid":32.080821511031324,"count":1},{"jingd":118.78273201664761,"weid":32.282513829040255,"count":1},{"jingd":118.99174145610732,"weid":31.38006157794698,"count":1},{"jingd":118.52048179191854,"weid":32.03651782684563,"count":1},{"jingd":118.63633374460557,"weid":32.05409874456154,"count":1},{"jingd":118.71458114701048,"weid":31.96745284990525,"count":1},{"jingd":118.61210948518365,"weid":32.03808129807795,"count":1},{"jingd":118.88263241301243,"weid":32.03459692021185,"count":1},{"jingd":118.84339436608724,"weid":31.99846385533061,"count":1},{"jingd":118.84329457394593,"weid":31.99846403967122,"count":1},{"jingd":118.86016293627179,"weid":32.01363113968653,"count":1},{"jingd":118.99513991363182,"weid":32.32209918201419,"count":1},{"jingd":118.6101906789557,"weid":31.835625243192123,"count":1},{"jingd":118.8571682118189,"weid":32.01153651014547,"count":1},{"jingd":118.90648479842896,"weid":31.63495090149608,"count":1},{"jingd":118.79918070852996,"weid":31.974447710232592,"count":1},{"jingd":118.80077809004744,"weid":31.97484526741215,"count":1},{"jingd":118.72421627144507,"weid":32.19291878875609,"count":1},{"jingd":118.86834973131023,"weid":32.019517437409775,"count":1},{"jingd":118.66467158136189,"weid":31.89468074250464,"count":1},{"jingd":118.75171692014288,"weid":31.966183128687753,"count":1},{"jingd":118.76554280962105,"weid":32.25922730474946,"count":1},{"jingd":118.96609460947654,"weid":31.795711959437885,"count":1},{"jingd":118.88263239489993,"weid":32.034396965419596,"count":1},{"jingd":118.92620473895064,"weid":31.724353897055426,"count":1},{"jingd":118.61170942402549,"weid":32.03908091336233,"count":2},{"jingd":118.99353418761626,"weid":32.32279438783529,"count":2},{"jingd":118.8658533905918,"weid":32.01592185563786,"count":1},{"jingd":118.96709770264168,"weid":31.79711417459681,"count":1},{"jingd":118.85636964962958,"weid":32.010937980637834,"count":2},{"jingd":118.72241300444603,"weid":32.18411804059445,"count":2},{"jingd":118.9661950315499,"weid":31.79711197336389,"count":1},{"jingd":118.70075458889683,"weid":31.95263476643343,"count":1},{"jingd":118.72311454607971,"weid":32.19031792125758,"count":1},{"jingd":118.72591911136723,"weid":32.19971967122813,"count":1},{"jingd":118.89932309359425,"weid":32.05408170102019,"count":1},{"jingd":118.8833316270043,"weid":32.03379643507544,"count":1},{"jingd":118.85087983035173,"weid":32.006248515401026,"count":1},{"jingd":118.88183318081741,"weid":32.03379788321392,"count":1},{"jingd":118.85607020373442,"weid":32.01083850635395,"count":1},{"jingd":118.99174144708756,"weid":31.37996154823892,"count":1},{"jingd":118.99226019327908,"weid":31.56739697279818,"count":1},{"jingd":118.86824987799383,"weid":32.01941760093631,"count":1},{"jingd":118.43505549068296,"weid":32.08062071436737,"count":1},{"jingd":118.9052893436719,"weid":31.68674875165162,"count":1},{"jingd":118.85696842911562,"weid":32.00983723283037,"count":1},{"jingd":118.88113390123792,"weid":32.03339867619944,"count":1},{"jingd":118.89229975122826,"weid":31.7606454102235,"count":1},{"jingd":119.13628531250369,"weid":31.315245313860256,"count":1},{"jingd":118.96719801021919,"weid":31.79721440422345,"count":1},{"jingd":118.72251318065803,"weid":32.18451809675731,"count":1},{"jingd":118.9871459392812,"weid":31.6087836482692,"count":1},{"jingd":118.9064848073367,"weid":31.635050900059753,"count":1},{"jingd":118.7201092004084,"weid":32.17861611299066,"count":1},{"jingd":119.0810512759874,"weid":31.922872339915443,"count":1},{"jingd":118.88253250755007,"weid":32.03449703936205,"count":2},{"jingd":118.85477258419529,"weid":32.009940909968186,"count":1},{"jingd":118.91499336836368,"weid":31.701249124939448,"count":2},{"jingd":118.87694395643796,"weid":32.08969092934615,"count":1},{"jingd":118.88273230983127,"weid":32.03459682401405,"count":1},{"jingd":118.68752658793703,"weid":31.948811925455985,"count":1},{"jingd":118.45959786507812,"weid":32.06538173429031,"count":1},{"jingd":118.72149233399483,"weid":31.97406029743287,"count":1},{"jingd":118.73648947496002,"weid":31.755717634182094,"count":1},{"jingd":118.85467275684894,"weid":32.009741126123906,"count":1},{"jingd":118.85696844728857,"weid":32.01003718685888,"count":1},{"jingd":119.18908050419518,"weid":31.31875607843878,"count":1},{"jingd":118.6284058200119,"weid":31.857133614191714,"count":1},{"jingd":118.97121062088362,"weid":31.801623748583392,"count":1},{"jingd":118.97783236313255,"weid":31.807540276682854,"count":1},{"jingd":119.05056241015342,"weid":31.62766248593641,"count":1},{"jingd":118.72261331014991,"weid":32.184418229066075,"count":1},{"jingd":118.88283220706354,"weid":32.03459672816631,"count":1},{"jingd":118.72141152941882,"weid":32.183416958111856,"count":1},{"jingd":118.85636965871757,"weid":32.01103795766328,"count":1},{"jingd":118.85746767400018,"weid":32.011735967512024,"count":1},{"jingd":118.88263240395617,"weid":32.03449694281471,"count":1},{"jingd":118.88133369208276,"weid":32.03349845114471,"count":1}];
//    var result = [{"jingd":118.72141151087386,"weid":32.183216988847676,"count":14}];
    buildData(result);
});

