export default `
    # ifdef GL_FRAGMENT_PRESICISON_HIGH
    precision highp float;
    # else 
    precision mediump float;  
    # endif
     
    attribute vec2 a_textureCoordinate;   
    attribute vec2 a_position;
    attribute vec4 a_color;
    attribute float a_textureIndex;
    
    uniform vec2 u_resolution;   
    
    varying vec4 v_color;
    varying vec2 v_textureCoordinate;
    varying float v_textureIndex;
    
    void main(){
        vec2 normalized = a_position / u_resolution;
        vec2 zero_two = normalized * 2.0;
        vec2 clip_space = zero_two - 1.0;
        
        // pass to fragment
        v_color = a_color;
        v_textureCoordinate = a_textureCoordinate;
        v_textureIndex = a_textureIndex;
        
        // flip y
        gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
    }
`;
