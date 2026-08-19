--
-- PostgreSQL database dump
--

\restrict FOs7gUoGdTBIKh47KNXTPMxIIDj4qYliNUofWpj7sh3bJZRLe6fkwtjTidCZb0A

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: estado_cuenta; Type: TYPE; Schema: public; Owner: admin_bank
--

CREATE TYPE public.estado_cuenta AS ENUM (
    'Activa',
    'Cerrada',
    'Bloqueada',
    'Suspendida'
);


ALTER TYPE public.estado_cuenta OWNER TO admin_bank;

--
-- Name: tipo_mfa; Type: TYPE; Schema: public; Owner: admin_bank
--

CREATE TYPE public.tipo_mfa AS ENUM (
    'SMS',
    'EMAIL',
    'APP_TOKEN',
    'BIOMETRIA'
);


ALTER TYPE public.tipo_mfa OWNER TO admin_bank;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cuentas_bancarias; Type: TABLE; Schema: public; Owner: admin_bank
--

CREATE TABLE public.cuentas_bancarias (
    id_cuenta integer NOT NULL,
    cbu character varying(22),
    alias character varying(255),
    saldo numeric(15,2),
    fecha_apertura date,
    estado public.estado_cuenta
);


ALTER TABLE public.cuentas_bancarias OWNER TO admin_bank;

--
-- Name: cuentas_bancarias_id_cuenta_seq; Type: SEQUENCE; Schema: public; Owner: admin_bank
--

CREATE SEQUENCE public.cuentas_bancarias_id_cuenta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.cuentas_bancarias_id_cuenta_seq OWNER TO admin_bank;

--
-- Name: cuentas_bancarias_id_cuenta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin_bank
--

ALTER SEQUENCE public.cuentas_bancarias_id_cuenta_seq OWNED BY public.cuentas_bancarias.id_cuenta;


--
-- Name: personas; Type: TABLE; Schema: public; Owner: admin_bank
--

CREATE TABLE public.personas (
    id integer NOT NULL,
    clerk_id character varying(255),
    nombre character varying(255),
    apellido character varying(255),
    dni character varying(255),
    direccion character varying(255),
    email character varying(255),
    telefono character varying(255),
    fechanac date,
    ciudad character varying(100),
    provincia character varying(100),
    pais character varying(100),
    codigo_postal character varying(20)
);


ALTER TABLE public.personas OWNER TO admin_bank;

--
-- Name: personas_id_seq; Type: SEQUENCE; Schema: public; Owner: admin_bank
--

CREATE SEQUENCE public.personas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.personas_id_seq OWNER TO admin_bank;

--
-- Name: personas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin_bank
--

ALTER SEQUENCE public.personas_id_seq OWNED BY public.personas.id;


--
-- Name: prestamos; Type: TABLE; Schema: public; Owner: admin_bank
--

CREATE TABLE public.prestamos (
    id integer NOT NULL,
    id_cuenta integer NOT NULL,
    monto numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT now(),
    fecha_resolucion timestamp without time zone,
    clerk_id_empleado character varying(255),
    clerk_id_gerente character varying(255),
    CONSTRAINT prestamos_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pre_aprobado'::character varying, 'aprobado'::character varying, 'rechazado'::character varying])::text[])))
);


ALTER TABLE public.prestamos OWNER TO admin_bank;

--
-- Name: prestamos_id_seq; Type: SEQUENCE; Schema: public; Owner: admin_bank
--

CREATE SEQUENCE public.prestamos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.prestamos_id_seq OWNER TO admin_bank;

--
-- Name: prestamos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin_bank
--

ALTER SEQUENCE public.prestamos_id_seq OWNED BY public.prestamos.id;


--
-- Name: tarjetas; Type: TABLE; Schema: public; Owner: admin_bank
--

CREATE TABLE public.tarjetas (
    id integer NOT NULL,
    id_cuenta integer NOT NULL,
    tipo character varying(10) NOT NULL,
    numero character varying(16),
    cvv character varying(3),
    fecha_vencimiento date,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT now(),
    fecha_resolucion timestamp without time zone,
    clerk_id_empleado character varying(255),
    clerk_id_gerente character varying(255),
    CONSTRAINT tarjetas_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pre_aprobada'::character varying, 'activa'::character varying, 'rechazada'::character varying])::text[]))),
    CONSTRAINT tarjetas_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['debito'::character varying, 'credito'::character varying])::text[])))
);


ALTER TABLE public.tarjetas OWNER TO admin_bank;

--
-- Name: tarjetas_id_seq; Type: SEQUENCE; Schema: public; Owner: admin_bank
--

CREATE SEQUENCE public.tarjetas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tarjetas_id_seq OWNER TO admin_bank;

--
-- Name: tarjetas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin_bank
--

ALTER SEQUENCE public.tarjetas_id_seq OWNED BY public.tarjetas.id;


--
-- Name: titulares_cuenta; Type: TABLE; Schema: public; Owner: admin_bank
--

CREATE TABLE public.titulares_cuenta (
    id_persona integer NOT NULL,
    id_cuenta integer NOT NULL,
    rol_titular character varying(20),
    fecha_alta timestamp without time zone
);


ALTER TABLE public.titulares_cuenta OWNER TO admin_bank;

--
-- Name: transferencias_central; Type: TABLE; Schema: public; Owner: admin_bank
--

CREATE TABLE public.transferencias_central (
    id integer NOT NULL,
    transaccion_central_id character varying(255) NOT NULL,
    cbu_origen character varying(22) NOT NULL,
    cbu_destino character varying(22) NOT NULL,
    importe numeric(15,2) NOT NULL,
    estado character varying(20) NOT NULL,
    tipo character varying(10) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transferencias_central_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['saliente'::character varying, 'entrante'::character varying])::text[])))
);


ALTER TABLE public.transferencias_central OWNER TO admin_bank;

--
-- Name: transferencias_central_id_seq; Type: SEQUENCE; Schema: public; Owner: admin_bank
--

CREATE SEQUENCE public.transferencias_central_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transferencias_central_id_seq OWNER TO admin_bank;

--
-- Name: transferencias_central_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin_bank
--

ALTER SEQUENCE public.transferencias_central_id_seq OWNED BY public.transferencias_central.id;


--
-- Name: cuentas_bancarias id_cuenta; Type: DEFAULT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.cuentas_bancarias ALTER COLUMN id_cuenta SET DEFAULT nextval('public.cuentas_bancarias_id_cuenta_seq'::regclass);


--
-- Name: personas id; Type: DEFAULT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.personas ALTER COLUMN id SET DEFAULT nextval('public.personas_id_seq'::regclass);


--
-- Name: prestamos id; Type: DEFAULT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.prestamos ALTER COLUMN id SET DEFAULT nextval('public.prestamos_id_seq'::regclass);


--
-- Name: tarjetas id; Type: DEFAULT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.tarjetas ALTER COLUMN id SET DEFAULT nextval('public.tarjetas_id_seq'::regclass);


--
-- Name: transferencias_central id; Type: DEFAULT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.transferencias_central ALTER COLUMN id SET DEFAULT nextval('public.transferencias_central_id_seq'::regclass);


--
-- Data for Name: cuentas_bancarias; Type: TABLE DATA; Schema: public; Owner: admin_bank
--

COPY public.cuentas_bancarias (id_cuenta, cbu, alias, saldo, fecha_apertura, estado) FROM stdin;
1	9762997712226669343037	francisco.arce.5575	0.00	2026-05-07	Activa
5	0200001523456321000202	mikeas.olivero.8100	0.00	2026-05-18	Activa
6	0200001533234459000302	janet.arce.3965	0.00	2026-05-24	Activa
8	0200001523758345000504	prueba.geremias.7020	80001.00	2026-05-27	Activa
7	0200001550234123000406	emilia.prueba.8946	215002.00	2026-05-24	Activa
9	0200001511222333000609	susana.allende.3991	0.00	2026-05-29	Activa
10	0200001511222444000701	paco.perro.4038	0.00	2026-05-30	Activa
11	0200001533123123000802	alicia.paco.2081	0.00	2026-05-30	Activa
4	0200001511234123000102	victor.prueba.3993	2307806.00	2026-05-17	Activa
2	8146354566038453870738	carlos.stupengo.6210	0.00	2026-05-11	Bloqueada
3	8518520627366288500004	prueba.prueba.9212	0.00	2026-05-11	Bloqueada
12	0200001511999111000903	guille.lbz.9026	0.00	2026-06-01	Activa
\.


--
-- Data for Name: personas; Type: TABLE DATA; Schema: public; Owner: admin_bank
--

COPY public.personas (id, clerk_id, nombre, apellido, dni, direccion, email, telefono, fechanac, ciudad, provincia, pais, codigo_postal) FROM stdin;
1	user_3CZz1ChwBwwo8EC8t2tuIC4FE42	Juan	Perez	4532123	campiones 2453	jaunpe@gmail.com	3534242598	1997-02-11	\N	\N	\N	\N
2	user_3Cqjtie5SngIFbJtuuXpwVdKRRp	Franco	Arce	gggfffdfdfdf	Bolivar 1988	francacha10@gmail.com	3534765647	1997-04-11	\N	\N	\N	\N
3	user_3CqpFKQePSVjdaBWweApjqyMMNG	Mateo	Mateo	44567865	lbz 1234	mateomm@gmail.com	3534897654	2000-03-11	\N	\N	\N	\N
4	user_3CxWoci4nGXixK2D22UGaOj4LIG	Tomas	Carle	47563234	Leibtnitz 125	tomascarle@gmail.com	3534242576	1820-04-11	\N	\N	\N	\N
5	user_3DAxlUFrxZkL1PJIMDeoS2XIE20	Franco	Perez	45623429	Av Sacapunta 147	francope@gmail.com	\N	2000-02-12	\N	\N	\N	\N
7	user_3DNRFbSl2YCSCV3Rg7H7Te0rs34	Carlos	Stupengo	45632234	Stupingo 345	francisco@gmail.com	3534567568	2007-12-04	San juan	SAN JUAN	Argentina	5000
9	user_3Db3AbhNwWFJRstdpI1Pwf9Paui	Prueba	prueba	41234267	Salomon 123	marta-1975@hotmail.com	3534765647	2025-09-11	Villa Maria	Cordoba	Argentina	5900
10	user_3DppDgnMs9wkBWo1ZIxkq3Tb5qu	Victor	Prueba	11234123	Prueba 2210	victorprueba@gmail.com	3536321432	2000-04-11	Serena	Bio bio	Chile	2000
11	user_3Dum6hXdfTn73Qd9n9amsZMw8RM	Mikeas	Olivero	23456321	lbz 3455	mikeas@gmail.com	3434352232	2000-11-12	villa maria	Cordoba	argentina	5900
12	user_3EBPsVHNNiemaorMdlwJbyRrkPk	Janet	Arce	33234459	Cartasdos 105	janetbank@gmail.com	351432896	2006-05-21	Villa Nueva	Cordoba	Argentina	5900
13	user_3EBfY3BzujKOMa56pjPIsP99ykq	Emilia	Prueba	50234123	Poco 65	emilia@prueba.com	3512345678	2020-03-11	San luis	San luis	Argentina	5900
14	user_3EHj438A7bz3Bz2cMJYXR0lXYlD	Prueba	Geremias	23758345	probando 1234	pruebaaa@gmal.com	3534897564	2025-03-21	villa maria	cordoba	argentina	5900
15	user_3EQ7EWlFxzQoA0VRlLJ8whHd14o	Susana	Allende	11222333	Psa 200	allendesusana@gmail.com	3534232498	2000-02-11	Villa nueva	Cordoba	Argentina	5900
16	user_3EQ8JWxgP9Pv4b1xzuY4ZekPMIA	Paco	Perro	11222444	Bolivia 900	pacoperro@gmail.com	3534789546	2027-03-11	Playosa	Cordoba	Argentina	6000
17	user_3EQ8lUyilzJCVnC5rddl85H5L80	Alicia	Paco	33123123	Colombia 3422	aliciapaco@gmail.com	3536321456	2024-03-08	Varillas	Cordoba	Argentina	4324
19	user_3EYQYxiL4qE7FNd2tY0jBp8vI1w	Guille	LBZ	11999111	Mateo calle S/N	guilleLBZ@gmail.com	3534768564	2010-11-02	Villa maria	Cordoba	Argentina	5900
\.


--
-- Data for Name: prestamos; Type: TABLE DATA; Schema: public; Owner: admin_bank
--

COPY public.prestamos (id, id_cuenta, monto, estado, fecha_solicitud, fecha_resolucion, clerk_id_empleado, clerk_id_gerente) FROM stdin;
1	4	200000.00	aprobado	2026-06-01 21:17:32.002454	2026-06-01 21:22:14.068927	user_3EBfY3BzujKOMa56pjPIsP99ykq	user_3EQ7EWlFxzQoA0VRlLJ8whHd14o
2	4	1000000.00	aprobado	2026-06-01 21:26:25.180223	2026-06-01 21:31:12.564509	user_3EBfY3BzujKOMa56pjPIsP99ykq	user_3EQ7EWlFxzQoA0VRlLJ8whHd14o
\.


--
-- Data for Name: tarjetas; Type: TABLE DATA; Schema: public; Owner: admin_bank
--

COPY public.tarjetas (id, id_cuenta, tipo, numero, cvv, fecha_vencimiento, estado, fecha_solicitud, fecha_resolucion, clerk_id_empleado, clerk_id_gerente) FROM stdin;
1	4	debito	5894618000798933	341	2030-06-01	activa	2026-06-01 21:17:37.222314	2026-06-01 21:22:16.572661	user_3EBfY3BzujKOMa56pjPIsP99ykq	user_3EQ7EWlFxzQoA0VRlLJ8whHd14o
\.


--
-- Data for Name: titulares_cuenta; Type: TABLE DATA; Schema: public; Owner: admin_bank
--

COPY public.titulares_cuenta (id_persona, id_cuenta, rol_titular, fecha_alta) FROM stdin;
7	2	Titular	2026-05-11 21:56:56.661782
9	3	Titular	2026-05-11 22:00:55.378707
10	4	Titular	2026-05-17 03:33:26.773362
11	5	Titular	2026-05-18 21:38:16.334299
12	6	Titular	2026-05-24 19:01:44.687728
13	7	Titular	2026-05-24 21:09:46.664841
14	8	Titular	2026-05-27 00:38:05.691466
15	9	Titular	2026-05-29 23:54:35.31835
16	10	Titular	2026-05-30 00:03:35.998245
17	11	Titular	2026-05-30 00:07:16.671653
19	12	Titular	2026-06-01 22:32:51.498364
\.


--
-- Data for Name: transferencias_central; Type: TABLE DATA; Schema: public; Owner: admin_bank
--

COPY public.transferencias_central (id, transaccion_central_id, cbu_origen, cbu_destino, importe, estado, tipo, fecha_hora) FROM stdin;
1	6a09389d5ea61ba925aef9dd	0200001511234123000102	0040001511122223000602	100.00	aprobada	saliente	2026-05-17 03:40:14.017309
2	6a0b83c75ea61ba925aefa0c	0200001511234123000102	0040001511122223000602	15000.00	aprobada	saliente	2026-05-18 21:25:28.141256
3	6a0b881f5ea61ba925aefa1d	0040001511122223000602	0200001511234123000102	15000.00	aprobada	entrante	2026-05-18 21:48:04.754745
4	6a0b8abf5ea61ba925aefa59	0190001922996338000208	0200001511234123000102	123456.00	aprobada	entrante	2026-05-18 21:58:04.840957
5	6a0b8a6e5ea61ba925aefa4d	0090001085154321000203	0200001511234123000102	15000.00	aprobada	entrante	2026-05-18 21:58:04.885736
6	6a0b8be65ea61ba925aefa84	0120001045493184002103	0200001511234123000102	1000000.00	aprobada	entrante	2026-05-18 22:03:04.785038
7	6a13697a27abdf4c6ffb39cc	0200001511234123000102	0200001550234123000406	100000.00	aprobada	saliente	2026-05-24 21:11:22.723178
8	6a136d9027abdf4c6ffb39e3	0200001511234123000102	0200001550234123000406	500.00	aprobada	saliente	2026-05-24 21:28:48.916003
9	6a136da727abdf4c6ffb39e6	0200001511234123000102	0200001550234123000406	500.00	aprobada	saliente	2026-05-24 21:29:12.080782
10	6a16399c27abdf4c6ffb3b04	0120001045789123001402	0200001550234123000406	1000000.00	aprobada	entrante	2026-05-27 00:24:36.259616
11	6a163a7727abdf4c6ffb3b13	0200001550234123000406	0120001045789123001402	500000.00	aprobada	saliente	2026-05-27 00:27:35.323958
12	6a163b5327abdf4c6ffb3b29	0200001550234123000406	0210001247937257000107	100000.00	aprobada	saliente	2026-05-27 00:31:16.239844
13	6a163b5c27abdf4c6ffb3b2b	0210001247937257000107	0200001550234123000406	10000.00	aprobada	entrante	2026-05-27 00:31:36.182167
14	6a163b7327abdf4c6ffb3b30	0210001247937257000107	0200001550234123000406	10000.00	aprobada	entrante	2026-05-27 00:32:37.022753
15	6a163dec27abdf4c6ffb3b4e	0190001922996338000208	0200001523758345000504	100001.00	aprobada	entrante	2026-05-27 00:42:36.832485
16	6a163e3f27abdf4c6ffb3b5e	0200001523758345000504	0200001550234123000406	10000.00	aprobada	saliente	2026-05-27 00:43:43.18416
17	6a163f1627abdf4c6ffb3b6b	0200001550234123000406	0090001047581835000308	20000.00	aprobada	saliente	2026-05-27 00:47:19.142295
18	6a163f7327abdf4c6ffb3b79	0200001550234123000406	0190001922996338000208	50000.00	aprobada	saliente	2026-05-27 00:48:51.700688
19	6a163fd927abdf4c6ffb3b84	0210001247937257000107	0200001550234123000406	1.00	aprobada	entrante	2026-05-27 00:50:36.888552
20	6a16405727abdf4c6ffb3b93	0210001247937257000107	0200001550234123000406	1.00	aprobada	entrante	2026-05-27 00:53:36.59149
21	6a165dbf27abdf4c6ffb3bf8	0200001550234123000406	0200001523758345000504	250000.00	aprobada	saliente	2026-05-27 02:58:07.207829
22	6a165de127abdf4c6ffb3bfd	0200001550234123000406	0200001523758345000504	15000.00	aprobada	saliente	2026-05-27 02:58:41.614192
23	6a165eb027abdf4c6ffb3c03	0200001523758345000504	0200001550234123000406	10000.00	aprobada	saliente	2026-05-27 03:02:08.875065
24	6a18c43f27abdf4c6ffb3d93	0200001511234123000102	0200001550234123000406	50000.00	aprobada	saliente	2026-05-28 22:39:59.439644
25	6a18c43f27abdf4c6ffb3d93_in	0200001511234123000102	0200001550234123000406	50000.00	aprobada	entrante	2026-05-28 22:39:59.439644
26	6a18c45b27abdf4c6ffb3d97	0200001511234123000102	0200001550234123000406	80000.00	aprobada	saliente	2026-05-28 22:40:27.17351
27	6a18c45b27abdf4c6ffb3d97_in	0200001511234123000102	0200001550234123000406	80000.00	aprobada	entrante	2026-05-28 22:40:27.17351
28	6a1df9ff27abdf4c6ffb419f	0060001944524785000306	0200001511234123000102	100450.00	aprobada	entrante	2026-06-01 21:31:07.815839
\.


--
-- Name: cuentas_bancarias_id_cuenta_seq; Type: SEQUENCE SET; Schema: public; Owner: admin_bank
--

SELECT pg_catalog.setval('public.cuentas_bancarias_id_cuenta_seq', 12, true);


--
-- Name: personas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin_bank
--

SELECT pg_catalog.setval('public.personas_id_seq', 19, true);


--
-- Name: prestamos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin_bank
--

SELECT pg_catalog.setval('public.prestamos_id_seq', 2, true);


--
-- Name: tarjetas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin_bank
--

SELECT pg_catalog.setval('public.tarjetas_id_seq', 1, true);


--
-- Name: transferencias_central_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin_bank
--

SELECT pg_catalog.setval('public.transferencias_central_id_seq', 28, true);


--
-- Name: cuentas_bancarias cuentas_bancarias_pkey; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.cuentas_bancarias
    ADD CONSTRAINT cuentas_bancarias_pkey PRIMARY KEY (id_cuenta);


--
-- Name: personas personas_clerk_id_key; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_clerk_id_key UNIQUE (clerk_id);


--
-- Name: personas personas_direccion_key; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_direccion_key UNIQUE (direccion);


--
-- Name: personas personas_dni_key; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_dni_key UNIQUE (dni);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id);


--
-- Name: prestamos prestamos_pkey; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.prestamos
    ADD CONSTRAINT prestamos_pkey PRIMARY KEY (id);


--
-- Name: tarjetas tarjetas_pkey; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.tarjetas
    ADD CONSTRAINT tarjetas_pkey PRIMARY KEY (id);


--
-- Name: titulares_cuenta titulares_cuenta_pkey; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.titulares_cuenta
    ADD CONSTRAINT titulares_cuenta_pkey PRIMARY KEY (id_persona, id_cuenta);


--
-- Name: transferencias_central transferencias_central_pkey; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.transferencias_central
    ADD CONSTRAINT transferencias_central_pkey PRIMARY KEY (id);


--
-- Name: transferencias_central transferencias_central_transaccion_central_id_key; Type: CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.transferencias_central
    ADD CONSTRAINT transferencias_central_transaccion_central_id_key UNIQUE (transaccion_central_id);


--
-- Name: prestamos prestamos_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.prestamos
    ADD CONSTRAINT prestamos_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES public.cuentas_bancarias(id_cuenta);


--
-- Name: tarjetas tarjetas_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.tarjetas
    ADD CONSTRAINT tarjetas_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES public.cuentas_bancarias(id_cuenta);


--
-- Name: titulares_cuenta titulares_cuenta_id_cuenta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.titulares_cuenta
    ADD CONSTRAINT titulares_cuenta_id_cuenta_fkey FOREIGN KEY (id_cuenta) REFERENCES public.cuentas_bancarias(id_cuenta);


--
-- Name: titulares_cuenta titulares_cuenta_id_persona_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin_bank
--

ALTER TABLE ONLY public.titulares_cuenta
    ADD CONSTRAINT titulares_cuenta_id_persona_fkey FOREIGN KEY (id_persona) REFERENCES public.personas(id);


--
-- PostgreSQL database dump complete
--

\unrestrict FOs7gUoGdTBIKh47KNXTPMxIIDj4qYliNUofWpj7sh3bJZRLe6fkwtjTidCZb0A

