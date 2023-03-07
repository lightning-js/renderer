import { createShader } from './utils.js';
import { getGlContext } from '../../stage.js';

export default ({ vs, fs, id = 'lightning-shader' }) => {
  const gl = getGlContext();
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vs);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (success) {
    return {
      enableAttributes() {
        const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
        const positionAttributeLocation = gl.getAttribLocation(
          program,
          'a_position',
        );
        const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');
        const textureAttributeLocation = gl.getAttribLocation(
          program,
          'a_textureCoordinate',
        );
        const textureIndexAttributeLocation = gl.getAttribLocation(
          program,
          'a_textureIndex',
        );

        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.vertexAttribPointer(
          positionAttributeLocation,
          2,
          gl.FLOAT,
          false,
          stride,
          0,
        );

        gl.enableVertexAttribArray(colorAttributeLocation);
        gl.vertexAttribPointer(
          colorAttributeLocation,
          4,
          gl.FLOAT,
          false,
          stride,
          2 * Float32Array.BYTES_PER_ELEMENT,
        );

        gl.enableVertexAttribArray(textureAttributeLocation);
        gl.vertexAttribPointer(
          textureAttributeLocation,
          2,
          gl.FLOAT,
          false,
          stride,
          6 * Float32Array.BYTES_PER_ELEMENT,
        );

        gl.enableVertexAttribArray(textureIndexAttributeLocation);
        gl.vertexAttribPointer(
          textureIndexAttributeLocation,
          1,
          gl.FLOAT,
          false,
          stride,
          8 * Float32Array.BYTES_PER_ELEMENT,
        );
      },
      enableUniforms() {
        const resolutionUniformLocation = gl.getUniformLocation(
          program,
          'u_resolution',
        );
        gl.uniform2f(
          resolutionUniformLocation,
          gl.canvas.width,
          gl.canvas.height,
        );
      },
      disableAttributes() {},
      get program() {
        return program;
      },
    };
  }
  console.error('unable to link program:', id);
  gl.deleteProgram(program);
};
