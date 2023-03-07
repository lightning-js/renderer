export default `
    # ifdef GL_FRAGMENT_PRESICISON_HIGH
    precision highp float;
    # else 
    precision mediump float;
    # endif
    
    uniform vec2 u_resolution; 
    uniform sampler2D u_image;
       
    varying vec4 v_color;
    varying vec2 v_textureCoordinate;
    
    void main(){ 
        gl_FragColor = vec4(v_color) * texture2D(u_image, v_textureCoordinate);
    }
`;
