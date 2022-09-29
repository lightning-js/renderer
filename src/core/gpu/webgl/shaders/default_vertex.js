export default `
    # ifdef GL_FRAGMENT_PRESICISON_HIGH
    precision highp float;
    # else 
    precision mediump float;
    # endif
     
    attribute vec2 a_textureCoordinate;   
    attribute vec2 a_position;
    attribute vec3 a_color;
    
    uniform vec2 u_resolution;   
    
    varying vec3 v_color;
    varying vec2 v_textureCoordinate;
    
    void main(){
        vec2 normalized = a_position / u_resolution;
        vec2 zero_two = normalized * 2.0;
        vec2 clip_space = zero_two - 1.0;
        
        // pass to fragment
        v_color = a_color;
        v_textureCoordinate = a_textureCoordinate;
        
        // flip y
        gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
    }
`