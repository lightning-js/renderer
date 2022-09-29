export default (textureUnits) =>{
    let source = `
        #define txUnits ${textureUnits}
        # ifdef GL_FRAGMENT_PRESICISON_HIGH
        precision highp float;
        # else 
        precision mediump float;
        # endif
        
        uniform vec2 u_resolution; 
        uniform sampler2D u_image;
        uniform sampler2D u_textures[txUnits];
           
        varying vec4 v_color;
        varying vec2 v_textureCoordinate;
        varying float v_textureIndex;
        
        vec4 sampleFromTexture(sampler2D textures[${textureUnits}], int idx, vec2 uv){
            vec4 color = vec4(0);            
            if(idx == 0){
                color = texture2D(textures[0], uv);
            }`;
            for(let i = 1; i < textureUnits; i++){
                source += `
                    else if (idx == ${i}){ 
                        color = texture2D(textures[${i}], uv);
                    }`
            }
        source += `
            return color;
        }        
        void main(){ 
            gl_FragColor = vec4(v_color) * sampleFromTexture(u_textures, int(v_textureIndex), v_textureCoordinate);
        }
`
    return source;
}