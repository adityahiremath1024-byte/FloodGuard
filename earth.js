// ===================================================
// FloodGuard - Earth WebGL Shader & Render Loop
// Luminous Green-Gold Theme
// ===================================================

const FS = `precision highp float;
uniform vec2 R;uniform float T;uniform sampler2D D;uniform sampler2D N;
float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+1.7;a*=.5;}return s;}
vec3 rx(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,v.y*c-v.z*s,v.y*s+v.z*c);}
vec3 rz(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x*c-v.y*s,v.x*s+v.y*c,v.z);}
vec3 city(float k){vec2 l;
  if(k<.5)l=vec2(28.6,77.2);else if(k<1.5)l=vec2(19.,72.8);else if(k<2.5)l=vec2(13.,77.6);else if(k<3.5)l=vec2(25.2,55.3);
  else if(k<4.5)l=vec2(30.,31.2);else if(k<5.5)l=vec2(41.,29.);else if(k<6.5)l=vec2(55.7,37.6);else if(k<7.5)l=vec2(39.9,116.4);
  else if(k<8.5)l=vec2(1.35,103.8);else if(k<9.5)l=vec2(35.7,139.7);else if(k<10.5)l=vec2(-1.3,36.8);else if(k<11.5)l=vec2(51.5,-.1);
  else l=vec2(6.5,3.4);
  l*=.0174533;return vec3(cos(l.x)*sin(l.y),sin(l.x),cos(l.x)*cos(l.y));}
vec2 net(vec3 p,float T){float arc=0.,ring=0.;
  for(int i=0;i<13;i++){float fi=float(i);
    vec3 a=city(fi);
    float ang=acos(clamp(dot(p,a),-1.,1.));
    float ph=fract(T*.28+fi*.173);float rr=ph*.07;float q1=(ang-rr)/.004;
    ring+=exp(-ang*ang/.00004)*1.5+exp(-q1*q1)*(1.-ph)*(1.-ph)*.9;
    vec3 b=city(mod(fi*5.+3.,13.));
    vec3 nm=cross(a,b);float nl=length(nm);
    if(nl>.05){
      nm/=nl;float off=abs(dot(p,nm));
      if(off<.06){
        vec3 pr=normalize(p-nm*dot(p,nm));
        float tot=acos(clamp(dot(a,b),-1.,1.));
        float t=atan(dot(pr,normalize(cross(nm,a))),dot(pr,a))/tot;
        if(t>0.&&t<1.){
          float fade=smoothstep(0.,.05,t)*smoothstep(1.,.95,t);
          float d=fract(fract(T*.11+fi*.37)-t);
          float tr=exp(-d*6.)*step(d,.6);
          float spike=exp(-d*d*2500.);
          float core=exp(-off*off/.0000032);
          float soft=exp(-off/.01);
          arc+=fade*(core*(.35+tr*1.6+spike*2.)+soft*(.06+tr*.35+spike*.5));
        }
      }
    }
  }
  return vec2(arc,ring);}
vec3 vor(vec2 p){vec2 ip=floor(p),fp=fract(p);float d1=8.,d2=8.;vec2 id=vec2(0.);
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));
    vec2 o=vec2(h(vec3(ip+g,1.)),h(vec3(ip+g,2.)));vec2 r=g+o*.8+.1-fp;float d=dot(r,r);
    if(d<d1){d2=d1;d1=d;id=ip+g;}else if(d<d2)d2=d;}
  return vec3(sqrt(d1),sqrt(d2)-sqrt(d1),h(vec3(id,3.)));}
vec3 ry(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x*c+v.z*s,v.y,-v.x*s+v.z*c);}
float lum(vec3 c){return dot(c,vec3(.3,.59,.11));}
vec2 sph(vec3 q,float off){return vec2(atan(q.x,q.z)/6.2831853+.5+off,.5-asin(clamp(q.y,-1.,1.))/3.14159265);}
vec3 S(vec3 c){return pow(c,vec3(2.2));}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;float asp=R.x/R.y;vec2 sc=gl_FragCoord.xy/R;
  vec3 rd=normalize(vec3(uv,-1.6));
  vec3 c=vec3(0.,-3.5,-4.2);float Rr=3.0;
  vec3 oc=-c;float b=dot(oc,rd);float disc=b*b-(dot(oc,oc)-Rr*Rr);
  vec3 sun=normalize(vec3(.7,.35,.45));
  vec2 sp=vec2(min(.53,.3*asp),-.27);float ty=sc.y;
  // ---- luminous green-gold sky
  vec3 col=mix(vec3(.38,.62,.46),vec3(.64,.84,.62),smoothstep(0.,.5,ty));
  col=mix(col,vec3(.88,.93,.68),smoothstep(.5,1.,ty)*.8);
  col=mix(col,vec3(.44,.76,.70),smoothstep(.2,.9,uv.x)*(1.-smoothstep(.15,.55,ty))*.5);
  float m1=fbm(vec3(uv*vec2(1.2,2.8)+vec2(T*.006,0.),T*.01+3.));
  float m2=fbm(vec3(uv*vec2(2.4,5.)-vec2(T*.01,0.),T*.02+11.));
  col=mix(col,vec3(.97,.99,.92),smoothstep(.40,.78,m1)*.45*smoothstep(.25,.9,ty));
  col=mix(col,vec3(.48,.68,.48),smoothstep(.5,.85,m2)*.15*smoothstep(.3,.8,ty));
  float mist=fbm(vec3(uv.x*1.5+T*.005,uv.y*5.,T*.015+7.));
  col=mix(col,vec3(.66,.82,.66),exp(-pow((uv.y+.02)*5.,2.))*(.25+.5*mist)*.5);
  vec2 df=uv-sp;float fd=length(df);
  col+=exp(-fd*2.2)*vec3(.10,.07,.02);
  // ---- atmosphere glow
  float dist=length(oc-rd*b);vec3 cp=normalize(oc-rd*b);float ex=max(dist-Rr,0.);
  float ss=smoothstep(-.4,.9,dot(cp,sun));
  vec3 aT=mix(vec3(.25,.62,.95),vec3(1.,.85,.52),ss);
  vec3 gl2=aT*(exp(-ex*70.)*.55+exp(-ex*20.)*.22+exp(-ex*6.)*.06)*(.35+.65*ss);
  col=1.-(1.-col)*(1.-clamp(gl2,0.,.9));
  // ---- Earth
  if(disc>0.&&b<0.){
    float t=-b-sqrt(disc);vec3 n=normalize(rd*t+oc);
    vec3 q=rz(rx(n,-1.3),.3);float spin=T*.008;vec2 tc=sph(q,.78-spin);
    vec3 raw0=texture2D(D,tc).rgb;vec3 raw=clamp(raw0+(raw0-.25*(texture2D(D,tc+vec2(1.3/4096.,0.)).rgb+texture2D(D,tc-vec2(1.3/4096.,0.)).rgb+texture2D(D,tc+vec2(0.,1.3/2048.)).rgb+texture2D(D,tc-vec2(0.,1.3/2048.)).rgb))*.9,0.,1.);vec3 dayc=pow(raw,vec3(2.2));
    float d=dot(n,sun);
    float water=clamp((raw.b-raw.r*1.4-.02)*6.,0.,1.);water=max(water,1.-smoothstep(.03,.14,lum(raw)));
    float landm=1.-water;
    float sp2=6.2831853*(.78-spin);vec3 qt=ry(q,sp2);vec3 sq=ry(rz(rx(sun,-1.3),.3),sp2);
    vec3 ea=normalize(vec3(qt.z,0.,-qt.x));vec3 no=cross(qt,ea);
    float gE=lum(texture2D(D,tc+vec2(1.5/4096.,0.)).rgb)-lum(texture2D(D,tc-vec2(1.5/4096.,0.)).rgb);
    float gN=-(lum(texture2D(D,tc+vec2(0.,1.5/2048.)).rgb)-lum(texture2D(D,tc-vec2(0.,1.5/2048.)).rgb));
    float relief=clamp(1.-5.*(gE*dot(sq,ea)+gN*dot(sq,no)),.8,1.25);
    vec3 surf=dayc*mix(1.,relief,landm)*mix(1.,3.4,water)*mix(vec3(1.),vec3(.97,1.03,.96),landm*.5)*(1.+landm*(n3(qt*260.)*.5+n3(qt*90.)*.5-.5)*.3);
    surf=mix(surf,vec3(.50,.92,.42)*lum(surf)*1.15,landm*.5*(1.-smoothstep(.5,.8,lum(raw))));
    vec3 cq=q;float a=-T*.011;cq=vec3(cq.x*cos(a)+cq.z*sin(a),cq.y,-cq.x*sin(a)+cq.z*cos(a));
    float cl=smoothstep(.52,.9,fbm(cq*3.+9.)*.7+fbm(cq*8.)*.2+n3(cq*22.)*.1);
    cl=clamp(cl+smoothstep(.62,.95,fbm(cq*vec3(2.,8.,2.)+3.))*.2,0.,1.)*.88;
    vec3 cs=cq+sun*.025;float csh=smoothstep(.52,.9,fbm(cs*3.+9.)*.7+fbm(cs*8.)*.2+n3(cs*22.)*.1);
    float dif=max(d,0.);vec3 sunCol=vec3(1.,.96,.88)*2.7;vec3 amb=vec3(.10,.14,.21);
    vec3 body=surf*(1.-.45*csh*(1.-cl))*(sunCol*dif+amb);
    body+=vec3(1.,.55,.2)*surf*exp(-d*d*50.)*.3*(1.-cl);
    float sd=max(dot(reflect(rd,n),sun),0.);
    body+=(pow(sd,300.)*3.+pow(sd,50.)*.3+pow(sd,8.)*.06)*water*(1.-cl)*vec3(1.,.93,.8);
    body=mix(body,vec3(.95,.97,1.)*(amb*2.+sunCol*dif*.9),cl);
    float night=1.-smoothstep(-.1,.12,d);
    body+=pow(texture2D(N,tc).rgb,vec3(2.2))*vec3(4.,2.6,1.2)*night*(1.-cl*.85);
    float rim=pow(1.-max(dot(n,-rd),0.),3.);
    body+=mix(vec3(.12,.3,.7),vec3(.9,.8,.6),ss)*rim*(.1+1.3*smoothstep(-.3,.6,d));
    vec2 nw=net(qt,T);
    body+=(nw.x*vec3(1.,.8,.4)*1.2+nw.y*vec3(1.,.9,.6)*.8)*(1.-cl*.5);
    col=pow(1.-exp(-body*1.9),vec3(.4545));
  }
  // ---- sun flare, rays, ghosts
  vec3 fl=vec3(1.,.88,.62)*(exp(-fd*60.)*1.6+exp(-fd*14.)*.25)+vec3(1.,.75,.4)*exp(-abs(df.y)*110.)*exp(-abs(df.x)*1.8)*.4;
  float ang=atan(df.y,df.x);
  fl+=vec3(1.,.82,.5)*pow(fbm(vec3(cos(ang)*3.,sin(ang)*3.,T*.05)),2.2)*exp(-fd*2.2)*.6;
  for(int i=1;i<4;i++){vec2 gp=sp*(1.-float(i)*.7);fl+=mix(vec3(1.,.8,.4),vec3(.5,1.,.8),float(i)/3.)*smoothstep(.06*float(i)+.02,.0,length(uv-gp))*.05;}
  col+=fl*.28;
  for(int k=0;k<2;k++){float sk=float(k);vec2 g=uv*(6.+sk*5.)+vec2(T*.03*(1.+sk),-T*.02);vec2 id=floor(g),f=fract(g)-.5;
    float r=h(vec3(id,sk+5.));vec2 o=vec2(h(vec3(id,sk+9.)),h(vec3(id,sk+13.)))-.5;float rad=.05+.1*r*r;
    col+=vec3(1.,.9,.65)*smoothstep(rad,rad*.6,length(f-o*.6))*step(.8,r)*.05*(.5+.5*sin(T*(.5+r)+r*30.))*exp(-fd*.9);}
  vec3 hi=max(col-.85,0.);col=col-hi+hi/(1.+hi*2.5);
  col*=1.-.07*dot(uv,uv);col*=vec3(.97,1.02,.96);
  col+=(h(vec3(gl_FragCoord.xy,floor(T*24.)))-.5)*.012;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;

const VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const cv = document.getElementById('c');
const gl = cv ? cv.getContext('webgl') : null;

function showErr(m) {
  let e = document.getElementById('err');
  if (!e) {
    e = document.createElement('pre');
    e.id = 'err';
    e.style.cssText = 'position:fixed;left:8px;top:8px;right:8px;color:#fca;font:12px monospace;white-space:pre-wrap;z-index:9;margin:0';
    document.body.appendChild(e);
  }
  e.textContent += m + '\n';
}

if (!gl) {
  showErr('WebGL is not available in this browser.');
} else {
  function sh(t, s) {
    const o = gl.createShader(t);
    gl.shaderSource(o, s);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) {
      showErr('Shader error: ' + gl.getShaderInfoLog(o));
    }
    return o;
  }

  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  gl.useProgram(p);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const a = gl.getAttribLocation(p, 'a');
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

  const uR = gl.getUniformLocation(p, 'R');
  const uT = gl.getUniformLocation(p, 'T');

  const LONG = 1600;
  function size() {
    const k = LONG / Math.max(innerWidth, innerHeight);
    cv.width = Math.round(innerWidth * k);
    cv.height = Math.round(innerHeight * k);
    gl.viewport(0, 0, cv.width, cv.height);
  }
  addEventListener('resize', size);
  size();

  function tex(unit, name, src) {
    return new Promise(r => {
      const im = new Image();
      im.onload = () => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(p, name), unit);
        r();
      };
      im.onerror = () => {
        showErr('Texture failed to load: ' + name);
        r();
      };
      im.src = src;
    });
  }

  Promise.all([
    tex(0, 'D', 'earth-day.jpg'),
    tex(1, 'N', 'earth-night.jpg')
  ]).then(() => {
    const t0 = performance.now();
    function loop() {
      gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform1f(uT, (performance.now() - t0) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
}
