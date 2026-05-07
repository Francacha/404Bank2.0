El archivo UserForm es el encargado de terminar de ingresar un usuario luego de la autetificacion de clerk.
En la type FormData:

type FormData = {
  nombre: string;
  apellido: string;
  dni: string;
  direccion: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
};
Esta definiendo la estructa del formulario. Luego de la linea 20 a 33 esta inicializando el formulario vacio y ademas obtiene datos de clerk.

usEffect: Consulta el gmail del usuario que deberia estar cargado dentro de clerk, pero estamos trabajando solo con nombre y contrasenia. 

Validate: Esta funcion valida que los datos cargados del usuario correspondan a la estructura establecida dentro de FormData

handleSubmit
1. Trae el token de clerk (dentro del token de clerk se encuentran diversos datos del usuario)
2. Luego de eso realiza un fetch el cual va enviar los datos cargados dentro del formulario.
3. Luego de esas dos acciones procede a mostrar el home si es que se inicio de forma correcta