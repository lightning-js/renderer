export default () => {
    return {
        name: 'default',
        attributes: [
            {type: 'vec2', name: 'a_textureCoordinate'},
            {type: 'vec2', name: 'a_position'},
            {type: 'vec2', name: 'a_color'},
        ],
        uniforms: [
            {type: 'vec2', name: 'u_resolution'},
            {type: 'sampler2D', name: 'u_image', fragment: true}
        ],
        varyings: [
            {type: 'vec3', name: 'v_color', attr: 'a_color'},
            {type: 'vec3', name: 'v_textureCoordinate', attr: 'a_textureCoordinate'},
        ],
        chunk:`
                vec2 normalized = a_position / u_resolution;
                vec2 zero_two = normalized * 2.0;
                vec2 clip_space = zero_two - 1.0;
                
                // pass to fragment
                #include [%varyings-assign]
                
                // flip y
                gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
        `,
        vertex: `
            #include [%attributes]
            #include [%uniforms]
            #include [%varyings]
            
            void main(){
                vec2 normalized = a_position / u_resolution;
                vec2 zero_two = normalized * 2.0;
                vec2 clip_space = zero_two - 1.0;
                
                // pass to fragment
                #include [%varyings-assign]
                
                // flip y
                gl_Position = vec4(clip_space * vec2(1.0, -1.0), 0, 1);
            }
        `,
        fragment: `
            uniform vec2 u_resolution; 
            uniform sampler2D u_image;
               
            varying vec3 v_color;
            varying vec2 v_textureCoordinate;
            
            void main(){ 
                gl_FragColor = vec4(v_color, 1.0) * texture2D(u_image, v_textureCoordinate);
            }        
        `
    };
}