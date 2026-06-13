--
-- PostgreSQL database dump
--

\restrict D75uUzMycnxPKdluOpF9oxMxuXquw3gHvLvAaMF4yZebMOmPdqEh2CbYiceEa83

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    icon character varying(100),
    display_order integer DEFAULT 0 NOT NULL,
    type character varying(50) DEFAULT 'main'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    meta text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: dining_tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dining_tables (
    id integer NOT NULL,
    table_number integer NOT NULL,
    status character varying(50) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.dining_tables OWNER TO postgres;

--
-- Name: dining_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dining_tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dining_tables_id_seq OWNER TO postgres;

--
-- Name: dining_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dining_tables_id_seq OWNED BY public.dining_tables.id;


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    unit character varying(50) DEFAULT 'piece'::character varying,
    base_unit character varying(50) DEFAULT 'piece'::character varying,
    pieces_per_unit integer DEFAULT 1,
    min_quantity integer DEFAULT 0,
    min_quantity_mode character varying(20) DEFAULT 'global'::character varying,
    notes text,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_items_id_seq OWNER TO postgres;

--
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- Name: inventory_stock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_stock (
    id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    location_id integer NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    min_quantity integer DEFAULT 0
);


ALTER TABLE public.inventory_stock OWNER TO postgres;

--
-- Name: inventory_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_stock_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_stock_id_seq OWNER TO postgres;

--
-- Name: inventory_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_stock_id_seq OWNED BY public.inventory_stock.id;


--
-- Name: main_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.main_categories (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(120) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.main_categories OWNER TO postgres;

--
-- Name: main_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.main_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.main_categories_id_seq OWNER TO postgres;

--
-- Name: main_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.main_categories_id_seq OWNED BY public.main_categories.id;


--
-- Name: menu_item_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_item_categories (
    menu_item_id integer NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.menu_item_categories OWNER TO postgres;

--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    price numeric(10,2),
    category character varying(100),
    main_category character varying(100),
    type character varying(50),
    is_available boolean DEFAULT true,
    image_url text,
    prep_time_minutes integer DEFAULT 0,
    sku character varying(100),
    barcode character varying(100),
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_items_id_seq OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: menus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menus (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    price_cents integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.menus OWNER TO postgres;

--
-- Name: menus_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menus_id_seq OWNER TO postgres;

--
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    menu_item_id integer,
    menu_id integer,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price integer,
    unit_price_cents integer,
    subtotal integer,
    item_type character varying(50),
    main_category character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_status_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_status_logs (
    id integer NOT NULL,
    order_id integer NOT NULL,
    status character varying(50) NOT NULL,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.order_status_logs OWNER TO postgres;

--
-- Name: order_status_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_status_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_status_logs_id_seq OWNER TO postgres;

--
-- Name: order_status_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_status_logs_id_seq OWNED BY public.order_status_logs.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    customer_id text,
    employee_id integer,
    table_number integer,
    waiter_id integer,
    cashier_id integer,
    type character varying(50),
    status character varying(50) NOT NULL,
    payment_status character varying(50),
    total_amount integer,
    total_cents integer DEFAULT 0,
    notes text,
    meta json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    organization_id integer,
    is_price_override boolean DEFAULT false NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: org_credit_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.org_credit_payments (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_date timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.org_credit_payments OWNER TO postgres;

--
-- Name: org_credit_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.org_credit_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.org_credit_payments_id_seq OWNER TO postgres;

--
-- Name: org_credit_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.org_credit_payments_id_seq OWNED BY public.org_credit_payments.id;


--
-- Name: org_credit_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.org_credit_transactions (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    payment_id integer,
    transaction_date timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    services jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.org_credit_transactions OWNER TO postgres;

--
-- Name: org_credit_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.org_credit_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.org_credit_transactions_id_seq OWNER TO postgres;

--
-- Name: org_credit_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.org_credit_transactions_id_seq OWNED BY public.org_credit_transactions.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    contact_name character varying(200),
    phone character varying(50),
    email character varying(200),
    address text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    version integer DEFAULT 1 NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    credit_balance numeric(12,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO postgres;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    name character varying(64) NOT NULL,
    display_name character varying(128) NOT NULL,
    icon character varying(64),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payment_methods OWNER TO postgres;

--
-- Name: payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_methods_id_seq OWNER TO postgres;

--
-- Name: payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    amount_cents integer,
    amount integer,
    method character varying(50),
    payment_method character varying(50),
    status character varying(50),
    processed_by integer,
    description text,
    qr_code text,
    paid_at timestamp without time zone,
    meta json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO postgres;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe_ingredients (
    id integer NOT NULL,
    recipe_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity integer NOT NULL,
    waste_factor numeric(5,3) DEFAULT 1.000 NOT NULL,
    is_optional boolean DEFAULT false NOT NULL,
    notes text,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.recipe_ingredients OWNER TO postgres;

--
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipe_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipe_ingredients_id_seq OWNER TO postgres;

--
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipe_ingredients_id_seq OWNED BY public.recipe_ingredients.id;


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipes (
    id integer NOT NULL,
    menu_item_id integer NOT NULL,
    name character varying(200) NOT NULL,
    yield_quantity integer DEFAULT 1 NOT NULL,
    deduct_from_location_id integer,
    deduct_strategy character varying(50) DEFAULT 'by_menu_category'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.recipes OWNER TO postgres;

--
-- Name: recipes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipes_id_seq OWNER TO postgres;

--
-- Name: recipes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipes_id_seq OWNED BY public.recipes.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(64) NOT NULL,
    display_name character varying(128) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: stock_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_locations (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(120) NOT NULL,
    description text,
    location_type character varying(50) DEFAULT 'storage'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    linked_main_category_slug character varying(120),
    meta jsonb DEFAULT '{}'::jsonb,
    version integer DEFAULT 1 NOT NULL,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_locations OWNER TO postgres;

--
-- Name: stock_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_locations_id_seq OWNER TO postgres;

--
-- Name: stock_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_locations_id_seq OWNED BY public.stock_locations.id;


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    inventory_item_id integer,
    movement_type character varying(50) NOT NULL,
    location character varying(50),
    location_id integer,
    quantity_delta integer NOT NULL,
    quantity_after integer,
    transfer_id integer,
    order_id integer,
    order_item_id integer,
    notes text,
    created_by integer,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_movements OWNER TO postgres;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_movements_id_seq OWNER TO postgres;

--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: stock_transfer_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_transfer_items (
    id integer NOT NULL,
    transfer_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity integer NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_transfer_items OWNER TO postgres;

--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_transfer_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_transfer_items_id_seq OWNER TO postgres;

--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_transfer_items_id_seq OWNED BY public.stock_transfer_items.id;


--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_transfers (
    id integer NOT NULL,
    from_location character varying(50),
    to_location character varying(50),
    from_location_id integer,
    to_location_id integer,
    status character varying(50) DEFAULT 'sent'::character varying NOT NULL,
    notes text,
    created_by integer,
    received_by integer,
    received_at timestamp without time zone,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.stock_transfers OWNER TO postgres;

--
-- Name: stock_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stock_transfers_id_seq OWNER TO postgres;

--
-- Name: stock_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_transfers_id_seq OWNED BY public.stock_transfers.id;


--
-- Name: sync_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_events (
    id bigint NOT NULL,
    event_type character varying(120) NOT NULL,
    entity_type character varying(80) NOT NULL,
    entity_id integer,
    entity_local_id character varying(120),
    operation character varying(20) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sync_events OWNER TO postgres;

--
-- Name: sync_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sync_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sync_events_id_seq OWNER TO postgres;

--
-- Name: sync_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sync_events_id_seq OWNED BY public.sync_events.id;


--
-- Name: sync_metadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_metadata (
    id integer NOT NULL,
    source character varying(100) NOT NULL,
    last_synced_at timestamp without time zone,
    last_revision integer
);


ALTER TABLE public.sync_metadata OWNER TO postgres;

--
-- Name: sync_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sync_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sync_metadata_id_seq OWNER TO postgres;

--
-- Name: sync_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sync_metadata_id_seq OWNED BY public.sync_metadata.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    username character varying(200),
    password_hash text,
    pin_hash text,
    role character varying(32) NOT NULL,
    role_id character varying(32),
    first_name character varying(200),
    last_name character varying(200),
    phone character varying(50),
    is_active boolean DEFAULT true,
    print_copies character varying(8) DEFAULT '1'::character varying,
    meta jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: dining_tables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dining_tables ALTER COLUMN id SET DEFAULT nextval('public.dining_tables_id_seq'::regclass);


--
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- Name: inventory_stock id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock ALTER COLUMN id SET DEFAULT nextval('public.inventory_stock_id_seq'::regclass);


--
-- Name: main_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_categories ALTER COLUMN id SET DEFAULT nextval('public.main_categories_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_status_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_logs ALTER COLUMN id SET DEFAULT nextval('public.order_status_logs_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: org_credit_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_credit_payments ALTER COLUMN id SET DEFAULT nextval('public.org_credit_payments_id_seq'::regclass);


--
-- Name: org_credit_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_credit_transactions ALTER COLUMN id SET DEFAULT nextval('public.org_credit_transactions_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: payment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: recipe_ingredients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients ALTER COLUMN id SET DEFAULT nextval('public.recipe_ingredients_id_seq'::regclass);


--
-- Name: recipes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes ALTER COLUMN id SET DEFAULT nextval('public.recipes_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: stock_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_locations ALTER COLUMN id SET DEFAULT nextval('public.stock_locations_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: stock_transfer_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfer_items ALTER COLUMN id SET DEFAULT nextval('public.stock_transfer_items_id_seq'::regclass);


--
-- Name: stock_transfers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers ALTER COLUMN id SET DEFAULT nextval('public.stock_transfers_id_seq'::regclass);


--
-- Name: sync_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_events ALTER COLUMN id SET DEFAULT nextval('public.sync_events_id_seq'::regclass);


--
-- Name: sync_metadata id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_metadata ALTER COLUMN id SET DEFAULT nextval('public.sync_metadata_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: postgres
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, icon, display_order, type, is_active, meta, created_at, updated_at) FROM stdin;
1	Breakfast	breakfast	\N	0	main	t	\N	2026-06-05 09:04:07.361847	2026-06-05 09:04:07.361847
2	Pizza	pizza	\N	0	main	t	\N	2026-06-05 09:04:07.664087	2026-06-05 09:04:07.664087
3	Sandwich	sandwich	\N	0	main	t	\N	2026-06-05 09:04:08.015983	2026-06-05 09:04:08.015983
4	Sweets	sweets	\N	0	main	t	\N	2026-06-05 09:04:08.272541	2026-06-05 09:04:08.272541
6	Coffee	coffee	coffee	1	main	t	\N	2026-06-05 09:05:15.556138	2026-06-05 09:05:15.556138
7	Cold Drinks	cold-drinks	snowflake	2	tag	t	\N	2026-06-05 09:05:15.804911	2026-06-05 09:05:15.804911
8	Popular	popular	star	3	promotion	t	\N	2026-06-05 09:05:16.099212	2026-06-05 09:05:16.099212
9	Pastry	pastry	croissant	4	main	t	\N	2026-06-05 09:05:16.383746	2026-06-05 09:05:16.383746
10	Barista	barista	cup-soda	5	workflow	t	\N	2026-06-05 09:05:16.793794	2026-06-05 09:05:16.793794
13	Tea And Non Coffee	tea-and-non-coffee	\N	0	main	t	\N	2026-06-06 03:25:49.906784	2026-06-06 03:25:49.906784
14	Mojito	mojito	\N	0	main	t	\N	2026-06-06 03:25:50.09409	2026-06-06 03:25:50.09409
15	Cake And Snacks	cake-and-snacks	\N	0	main	t	\N	2026-06-06 03:25:50.300557	2026-06-06 03:25:50.300557
5	Beverages	beverages	\N	0	main	t	\N	2026-06-05 09:04:08.591919	2026-06-06 03:25:50.355
17	Cakes And Bakery	cakes-and-bakery	\N	0	main	t	\N	2026-06-10 05:35:43.762115	2026-06-10 05:40:08.481
12	Cold Coffee	cold-coffee	\N	0	main	t	\N	2026-06-06 03:25:49.73968	2026-06-10 05:40:08.91
11	Basic Coffee	basic-coffee	\N	0	main	t	\N	2026-06-06 03:25:49.507042	2026-06-10 05:40:09.11
20	Hot Drinks And Tea	hot-drinks-and-tea	\N	0	main	t	\N	2026-06-10 05:35:44.462309	2026-06-10 05:40:09.303
21	mojitos	mojitos	\N	0	main	t	\N	2026-06-10 05:35:44.686804	2026-06-11 11:58:28.083
29	water	water	\N	0	tag	t	\N	2026-06-11 11:58:28.039163	2026-06-11 11:59:13.105
27	cafe	cafe	\N	0	main	t	\N	2026-06-11 11:16:07.879663	2026-06-11 12:23:09.542
\.


--
-- Data for Name: dining_tables; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dining_tables (id, table_number, status, created_at, updated_at) FROM stdin;
1	1	available	2026-06-06 04:42:08.924763	2026-06-06 04:42:08.924763
2	2	available	2026-06-06 04:42:08.924763	2026-06-06 04:42:08.924763
3	3	available	2026-06-06 05:54:14.850983	2026-06-06 05:54:14.850983
4	4	available	2026-06-06 05:54:57.422282	2026-06-06 05:54:57.422282
5	5	available	2026-06-06 05:55:04.499948	2026-06-06 05:55:04.499948
6	6	available	2026-06-06 05:55:11.857899	2026-06-06 05:55:11.857899
7	7	available	2026-06-06 05:56:05.41654	2026-06-06 05:56:05.41654
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_items (id, name, unit, base_unit, pieces_per_unit, min_quantity, min_quantity_mode, notes, meta, created_at, updated_at) FROM stdin;
94	FLOUR	kg	kg	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:21.734869	2026-06-10 05:35:21.734869
95	SUGAR	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:22.125574	2026-06-10 05:35:22.125574
96	YEAST	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:22.359491	2026-06-10 05:35:22.359491
97	BUTEER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:22.642801	2026-06-10 05:35:22.642801
98	SALT	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:23.056583	2026-06-10 05:35:23.056583
99	BLEAD.IMPORTED	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:23.454064	2026-06-10 05:35:23.454064
100	CHOCOLATE	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:23.739024	2026-06-10 05:35:23.739024
101	EGG	pes	pes	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:23.978456	2026-06-10 05:35:23.978456
102	CINNAMON.spice Powder	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:24.277045	2026-06-10 05:35:24.277045
103	VANILA	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:24.594775	2026-06-10 05:35:24.594775
104	SUPER GATO	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:24.987665	2026-06-10 05:35:24.987665
105	CORN FLOUR	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:25.308576	2026-06-10 05:35:25.308576
106	MILK	ml	ml	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:26.065758	2026-06-10 05:35:26.065758
107	COCA.POWDER	ml	ml	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:27.346147	2026-06-10 05:35:27.346147
108	CHOCALETE.GLAZE	ml	ml	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:27.661054	2026-06-10 05:35:27.661054
109	CHOCALETE.DARK (DRY)	ml	ml	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:29.008677	2026-06-10 05:35:29.008677
110	TABLE.BUTTER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:29.823598	2026-06-10 05:35:29.823598
111	OIL	ml	ml	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:31.648814	2026-06-10 05:35:31.648814
112	COFFEE	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:32.144328	2026-06-10 05:35:32.144328
113	ICED	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:32.495843	2026-06-10 05:35:32.495843
114	CHOCOLATE .SYRAPE	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:32.776275	2026-06-10 05:35:32.776275
115	ICE	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:33.014451	2026-06-10 05:35:33.014451
116	FASTING MATE	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:33.387944	2026-06-10 05:35:33.387944
117	CAPPUCHINO.POWDER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:33.69219	2026-06-10 05:35:33.69219
118	WATER HOT	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:34.106314	2026-06-10 05:35:34.106314
119	PUNET BUTEER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:34.470035	2026-06-10 05:35:34.470035
120	TEA	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:34.97718	2026-06-10 05:35:34.97718
121	GINGER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:36.751502	2026-06-10 05:35:36.751502
122	HONEY	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:37.70037	2026-06-10 05:35:37.70037
123	MANGO POWDER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:38.225373	2026-06-10 05:35:38.225373
124	PENAPPLE POWDER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:38.508914	2026-06-10 05:35:38.508914
125	ORANGE POWDER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:38.882734	2026-06-10 05:35:38.882734
126	FINISHED TEA	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:39.243325	2026-06-10 05:35:39.243325
127	LEMON	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:40.197162	2026-06-10 05:35:40.197162
128	MEANT FLEVER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:40.935005	2026-06-10 05:35:40.935005
129	MEANT LEAF	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:41.3193	2026-06-10 05:35:41.3193
130	SOFT DRINK (SPRITE)	ml	ml	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:41.720031	2026-06-10 05:35:41.720031
131	STROBERY FLEVER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:42.095023	2026-06-10 05:35:42.095023
132	BLUBAREY FLEVER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:42.965046	2026-06-10 05:35:42.965046
133	MANGO FLEVER	gram	gram	1	0	global	\N	{"source": "recipe_dataset"}	2026-06-10 05:35:43.556169	2026-06-10 05:35:43.556169
\.


--
-- Data for Name: inventory_stock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_stock (id, inventory_item_id, location_id, quantity, min_quantity) FROM stdin;
\.


--
-- Data for Name: main_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.main_categories (id, name, slug, display_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: menu_item_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_item_categories (menu_item_id, category_id, created_at) FROM stdin;
61	17	2026-06-10 05:40:10.418343
62	17	2026-06-10 05:40:11.468831
63	17	2026-06-10 05:40:12.427131
64	17	2026-06-10 05:40:13.449098
65	17	2026-06-10 05:40:14.37584
66	17	2026-06-10 05:40:15.395771
67	12	2026-06-10 05:40:16.217123
68	12	2026-06-10 05:40:17.028976
69	12	2026-06-10 05:40:17.858547
70	11	2026-06-10 05:40:18.380855
71	11	2026-06-10 05:40:19.286755
72	11	2026-06-10 05:40:20.303464
73	11	2026-06-10 05:40:21.137827
74	11	2026-06-10 05:40:22.105953
75	11	2026-06-10 05:40:22.765493
76	11	2026-06-10 05:40:23.603963
77	20	2026-06-10 05:40:24.301371
78	20	2026-06-10 05:40:25.086066
79	20	2026-06-10 05:40:26.074427
80	20	2026-06-10 05:40:26.861128
81	20	2026-06-10 05:40:27.677858
82	20	2026-06-10 05:40:28.578318
83	20	2026-06-10 05:40:29.372224
84	21	2026-06-10 05:40:30.242197
85	21	2026-06-10 05:40:31.173244
86	21	2026-06-10 05:40:31.991891
87	21	2026-06-10 05:40:32.52437
88	27	2026-06-11 11:16:07.879663
89	21	2026-06-11 11:58:28.039163
89	29	2026-06-11 11:58:28.039163
90	29	2026-06-11 11:59:13.077395
91	27	2026-06-11 12:13:28.403742
92	27	2026-06-11 12:21:27.98095
93	27	2026-06-11 12:22:30.8764
94	27	2026-06-11 12:23:09.520237
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, name, description, price, category, main_category, type, is_available, image_url, prep_time_minutes, sku, barcode, meta, created_at, updated_at) FROM stdin;
68	Iced Mocha	\N	133.40	cold-coffee	cold-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cold_coffee"}	2026-06-10 05:40:16.843997	2026-06-10 05:40:16.843997
71	Fasting Machiato	\N	112.70	basic-coffee	basic-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "basic_coffee"}	2026-06-10 05:40:19.080571	2026-06-10 05:40:19.080571
76	Americano	\N	160.00	basic-coffee	basic-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "basic_coffee"}	2026-06-10 05:40:23.49601	2026-06-10 05:40:23.49601
75	Cappuchino	\N	180.00	basic-coffee	basic-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "basic_coffee"}	2026-06-10 05:40:22.587374	2026-06-10 05:40:22.587374
72	Machiato	\N	110.00	basic-coffee	basic-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "basic_coffee"}	2026-06-10 05:40:20.102107	2026-06-10 05:40:20.102107
73	Espresso	\N	110.00	basic-coffee	basic-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "basic_coffee"}	2026-06-10 05:40:20.985057	2026-06-10 05:40:20.985057
74	Milk With Coffee	\N	160.00	basic-coffee	basic-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "basic_coffee"}	2026-06-10 05:40:21.956702	2026-06-10 05:40:21.956702
77	Hot Chocholate	\N	150.00	hot-drinks-and-tea	hot-drinks-and-tea	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "hot_drinks_and_tea"}	2026-06-10 05:40:24.096282	2026-06-10 05:40:24.096282
69	Iced Late	\N	180.00	cold-coffee	cold-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cold_coffee"}	2026-06-10 05:40:17.686146	2026-06-10 05:40:17.686146
67	Iced Coffee	\N	180.00	cold-coffee	cold-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cold_coffee"}	2026-06-10 05:40:16.010039	2026-06-10 05:40:16.010039
78	Peanut Tea	\N	100.00	hot-drinks-and-tea	hot-drinks-and-tea	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "hot_drinks_and_tea"}	2026-06-10 05:40:24.97252	2026-06-10 05:40:24.97252
86	Blubary Mojitos	\N	350.00	mojitos	mojitos	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "mojitos"}	2026-06-10 05:40:31.780935	2026-06-10 05:40:31.780935
87	Mango Mojitos	\N	350.00	mojitos	mojitos	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "mojitos"}	2026-06-10 05:40:32.404338	2026-06-10 05:40:32.404338
85	Strawberry Mojitos	\N	350.00	mojitos	mojitos	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "mojitos"}	2026-06-10 05:40:30.959958	2026-06-10 05:40:30.959958
84	MintMojito	\N	350.00	mojitos	mojitos	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "mojitos"}	2026-06-10 05:40:30.050513	2026-06-10 05:40:30.050513
61	Crossent Cake	\N	250.00	cakes-and-bakery	cakes-and-bakery	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cakes_and_bakery"}	2026-06-10 05:40:10.072412	2026-06-10 05:40:10.072412
63	Cinnamon Cake	\N	250.00	cakes-and-bakery	cakes-and-bakery	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cakes_and_bakery"}	2026-06-10 05:40:12.265554	2026-06-10 05:40:12.265554
79	Special Tea	\N	110.00	hot-drinks-and-tea	hot-drinks-and-tea	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "hot_drinks_and_tea"}	2026-06-10 05:40:25.762419	2026-06-10 05:40:25.762419
83	Tea With Lemon	\N	80.00	hot-drinks-and-tea	hot-drinks-and-tea	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "hot_drinks_and_tea"}	2026-06-10 05:40:29.262128	2026-06-10 05:40:29.262128
62	Crossent Sanduwich	\N	250.00	cakes-and-bakery	cakes-and-bakery	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cakes_and_bakery"}	2026-06-10 05:40:11.208596	2026-06-10 05:40:11.208596
66	Boxegna Cake	\N	85.00	cakes-and-bakery	cakes-and-bakery	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cakes_and_bakery"}	2026-06-10 05:40:15.189651	2026-06-10 05:40:15.189651
65	Cream Chocolate Cake	\N	90.00	cakes-and-bakery	cakes-and-bakery	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cakes_and_bakery"}	2026-06-10 05:40:14.172675	2026-06-10 05:40:14.172675
64	Custerd Crame Cake	\N	80.00	cakes-and-bakery	cakes-and-bakery	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "cakes_and_bakery"}	2026-06-10 05:40:13.24395	2026-06-10 05:40:13.24395
70	Latte	\N	180.00	basic-coffee	basic-coffee	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "basic_coffee"}	2026-06-10 05:40:18.27913	2026-06-10 05:40:18.27913
81	Tea With Sprice	\N	100.00	hot-drinks-and-tea	hot-drinks-and-tea	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "hot_drinks_and_tea"}	2026-06-10 05:40:27.561548	2026-06-10 05:40:27.561548
80	Milk	\N	110.00	hot-drinks-and-tea	hot-drinks-and-tea	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "hot_drinks_and_tea"}	2026-06-10 05:40:26.758932	2026-06-10 05:40:26.758932
82	Ginger Tea	\N	80.00	hot-drinks-and-tea	hot-drinks-and-tea	cafe	t	\N	0	\N	\N	{"source": "recipe_dataset", "dataset_category": "hot_drinks_and_tea"}	2026-06-10 05:40:28.461085	2026-06-10 05:40:28.461085
88	soft drink		80.00	cafe	mojitos	cafe	t	\N	0			{}	2026-06-11 11:16:07.879663	2026-06-11 11:16:07.879663
89	Water 1L		55.00	mojitos	mojitos	cafe	t	\N	0			{}	2026-06-11 11:58:28.039163	2026-06-11 11:58:28.039163
90	water 0.5 L		45.00	water	mojitos	cafe	t	\N	0			{}	2026-06-11 11:59:13.077395	2026-06-11 11:59:13.077395
91	TEA		60.00	cafe	hot-drinks-and-tea	cafe	t	\N	0			{}	2026-06-11 12:13:28.403742	2026-06-11 12:13:28.403742
92	Pineapple Mojito		350.00	cafe	mojitos	cafe	t	\N	0			{}	2026-06-11 12:21:27.98095	2026-06-11 12:21:27.98095
93	Grape Mojito		350.00	cafe	mojitos	cafe	t	\N	0			{}	2026-06-11 12:22:30.8764	2026-06-11 12:22:30.8764
94	Passion Mojito		350.00	cafe	mojitos	cafe	t	\N	0			{}	2026-06-11 12:23:09.520237	2026-06-11 12:23:09.520237
\.


--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menus (id, name, description, price_cents, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, menu_item_id, menu_id, quantity, unit_price, unit_price_cents, subtotal, item_type, main_category, created_at) FROM stdin;
19	17	65	\N	2	90	\N	180	cakes-and-bakery	\N	2026-06-11 11:22:50.18271
20	17	64	\N	1	80	\N	80	cakes-and-bakery	\N	2026-06-11 11:22:50.18271
21	17	88	\N	1	80	\N	80	mojitos	\N	2026-06-11 11:22:50.18271
\.


--
-- Data for Name: order_status_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_status_logs (id, order_id, status, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, customer_id, employee_id, table_number, waiter_id, cashier_id, type, status, payment_status, total_amount, total_cents, notes, meta, created_at, updated_at, organization_id, is_price_override) FROM stdin;
17	9199aec4-f33e-46fc-86d1-f1ca5f63674a	7	5	7	\N	cafe	pending	pending	340	0	\N	{"localId":"6979a629-310b-42af-9a1a-7131478bd96b","is_printed":1}	2026-06-11 11:18:51.95	2026-06-11 11:22:50.18271	\N	f
\.


--
-- Data for Name: org_credit_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.org_credit_payments (id, organization_id, amount, payment_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: org_credit_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.org_credit_transactions (id, organization_id, payment_id, transaction_date, notes, services, total_amount, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, contact_name, phone, email, address, notes, is_active, meta, version, deleted_at, created_at, updated_at, credit_balance) FROM stdin;
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_methods (id, name, display_name, icon, description, is_active, created_at, updated_at) FROM stdin;
1	cash	Cash	dollar-sign	\N	t	2026-06-05 12:13:16.041378	2026-06-05 12:13:16.041378
2	mobile	Mobile	smartphone	\N	t	2026-06-05 12:13:31.17636	2026-06-05 12:13:31.17636
3	card	Card	credit-card	\N	t	2026-06-05 12:13:41.830169	2026-06-05 12:13:41.830169
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, order_id, amount_cents, amount, method, payment_method, status, processed_by, description, qr_code, paid_at, meta, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recipe_ingredients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipe_ingredients (id, recipe_id, inventory_item_id, quantity, waste_factor, is_optional, notes, display_order) FROM stdin;
204	43	94	1	1.000	f	\N	0
205	43	95	100	1.000	f	\N	1
206	43	96	20	1.000	f	\N	2
207	43	97	300	1.000	f	\N	3
208	43	98	20	1.000	f	\N	4
209	43	99	20	1.000	f	\N	5
210	43	100	100	1.000	f	\N	6
211	43	101	6	1.000	f	\N	7
212	44	94	1	1.000	f	\N	0
213	44	95	100	1.000	f	\N	1
214	44	96	20	1.000	f	\N	2
215	44	97	300	1.000	f	\N	3
216	44	98	20	1.000	f	\N	4
217	44	99	20	1.000	f	\N	5
218	44	100	100	1.000	f	\N	6
219	44	101	6	1.000	f	\N	7
220	45	94	1	1.000	f	\N	0
221	45	95	100	1.000	f	\N	1
222	45	96	20	1.000	f	\N	2
223	45	97	300	1.000	f	\N	3
224	45	98	20	1.000	f	\N	4
225	45	99	20	1.000	f	\N	5
226	45	100	100	1.000	f	\N	6
227	45	102	20	1.000	f	\N	7
228	45	101	6	1.000	f	\N	8
229	46	94	1	1.000	f	\N	0
230	46	95	1100	1.000	f	\N	1
231	46	103	20	1.000	f	\N	2
232	46	104	250	1.000	f	\N	3
233	46	105	80	1.000	f	\N	4
234	46	106	2	1.000	f	\N	5
235	46	101	40	1.000	f	\N	6
236	47	94	1	1.000	f	\N	0
237	47	95	1100	1.000	f	\N	1
238	47	103	20	1.000	f	\N	2
239	47	104	250	1.000	f	\N	3
240	47	105	80	1.000	f	\N	4
241	47	106	2	1.000	f	\N	5
242	47	107	200	1.000	f	\N	6
243	47	108	400	1.000	f	\N	7
244	47	109	200	1.000	f	\N	8
245	47	101	40	1.000	f	\N	9
246	48	94	1	1.000	f	\N	0
247	48	95	100	1.000	f	\N	1
248	48	98	15	1.000	f	\N	2
249	48	110	50	1.000	f	\N	3
250	48	105	40	1.000	f	\N	4
251	48	106	1	1.000	f	\N	5
252	48	111	400	1.000	f	\N	6
253	48	101	32	1.000	f	\N	7
254	49	112	20	1.000	f	\N	0
255	49	95	30	1.000	f	\N	1
256	49	113	70	1.000	f	\N	2
257	50	112	20	1.000	f	\N	0
258	50	95	30	1.000	f	\N	1
259	50	114	40	1.000	f	\N	2
260	50	113	70	1.000	f	\N	3
261	50	106	150	1.000	f	\N	4
262	51	112	20	1.000	f	\N	0
263	51	95	30	1.000	f	\N	1
264	51	115	20	1.000	f	\N	2
265	51	106	130	1.000	f	\N	3
266	52	112	20	1.000	f	\N	0
267	52	95	30	1.000	f	\N	1
268	52	106	140	1.000	f	\N	2
269	53	112	20	1.000	f	\N	0
270	53	95	30	1.000	f	\N	1
271	53	116	60	1.000	f	\N	2
272	54	106	85	1.000	f	\N	0
273	54	95	30	1.000	f	\N	1
274	54	112	20	1.000	f	\N	2
275	55	112	20	1.000	f	\N	0
276	55	95	30	1.000	f	\N	1
277	56	106	150	1.000	f	\N	0
278	56	112	20	1.000	f	\N	1
279	56	95	30	1.000	f	\N	2
280	57	106	150	1.000	f	\N	0
281	57	95	30	1.000	f	\N	1
282	57	112	20	1.000	f	\N	2
283	57	117	8	1.000	f	\N	3
284	58	112	20	1.000	f	\N	0
285	58	95	30	1.000	f	\N	1
286	58	118	250	1.000	f	\N	2
287	59	106	90	1.000	f	\N	0
288	59	95	30	1.000	f	\N	1
289	59	112	10	1.000	f	\N	2
290	59	114	15	1.000	f	\N	3
291	60	119	40	1.000	f	\N	0
292	60	95	30	1.000	f	\N	1
293	61	120	10	1.000	f	\N	0
294	61	121	25	1.000	f	\N	1
295	61	122	50	1.000	f	\N	2
296	61	123	10	1.000	f	\N	3
297	61	124	10	1.000	f	\N	4
298	61	125	20	1.000	f	\N	5
299	62	106	140	1.000	f	\N	0
300	62	95	30	1.000	f	\N	1
301	63	112	20	1.000	f	\N	0
302	63	95	30	1.000	f	\N	1
303	63	120	20	1.000	f	\N	2
304	64	121	50	1.000	f	\N	0
305	64	95	30	1.000	f	\N	1
306	65	126	10	1.000	f	\N	0
307	65	95	30	1.000	f	\N	1
308	65	127	30	1.000	f	\N	2
309	66	128	45	1.000	f	\N	0
310	66	127	30	1.000	f	\N	1
311	66	115	30	1.000	f	\N	2
312	66	129	10	1.000	f	\N	3
313	66	130	200	1.000	f	\N	4
314	67	131	40	1.000	f	\N	0
315	67	127	20	1.000	f	\N	1
316	67	115	30	1.000	f	\N	2
317	67	129	10	1.000	f	\N	3
318	67	130	200	1.000	f	\N	4
319	68	132	40	1.000	f	\N	0
320	68	127	20	1.000	f	\N	1
321	68	115	30	1.000	f	\N	2
322	68	129	10	1.000	f	\N	3
323	68	130	200	1.000	f	\N	4
324	69	133	45	1.000	f	\N	0
325	69	127	30	1.000	f	\N	1
326	69	115	30	1.000	f	\N	2
327	69	129	10	1.000	f	\N	3
328	69	130	200	1.000	f	\N	4
\.


--
-- Data for Name: recipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.recipes (id, menu_item_id, name, yield_quantity, deduct_from_location_id, deduct_strategy, is_active, meta, created_at, updated_at) FROM stdin;
43	61	Crossent Cake	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cakes_and_bakery"}	2026-06-10 05:40:10.788327	2026-06-10 05:40:10.788327
44	62	Crossent Sanduwich	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cakes_and_bakery"}	2026-06-10 05:40:11.990504	2026-06-10 05:40:11.990504
45	63	Cinnamon Cake	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cakes_and_bakery"}	2026-06-10 05:40:12.848866	2026-06-10 05:40:12.848866
46	64	Custerd Crame Cake	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cakes_and_bakery"}	2026-06-10 05:40:13.861531	2026-06-10 05:40:13.861531
47	65	Cream Chocolate Cake	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cakes_and_bakery"}	2026-06-10 05:40:14.782195	2026-06-10 05:40:14.782195
48	66	Boxegna Cake	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cakes_and_bakery"}	2026-06-10 05:40:15.70268	2026-06-10 05:40:15.70268
49	67	Iced Coffee	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cold_coffee"}	2026-06-10 05:40:16.596814	2026-06-10 05:40:16.596814
50	68	Iced Mocha	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cold_coffee"}	2026-06-10 05:40:17.445508	2026-06-10 05:40:17.445508
51	69	Iced Late	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "cold_coffee"}	2026-06-10 05:40:18.072879	2026-06-10 05:40:18.072879
52	70	Caffee Late	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "basic_coffee"}	2026-06-10 05:40:18.690253	2026-06-10 05:40:18.690253
53	71	Fasting Machiato	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "basic_coffee"}	2026-06-10 05:40:19.719168	2026-06-10 05:40:19.719168
54	72	Machiato	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "basic_coffee"}	2026-06-10 05:40:20.557226	2026-06-10 05:40:20.557226
55	73	Espresso	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "basic_coffee"}	2026-06-10 05:40:21.541305	2026-06-10 05:40:21.541305
56	74	Milk With Coffee	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "basic_coffee"}	2026-06-10 05:40:22.366512	2026-06-10 05:40:22.366512
57	75	Cappuchino	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "basic_coffee"}	2026-06-10 05:40:23.07268	2026-06-10 05:40:23.07268
58	76	Americano	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "basic_coffee"}	2026-06-10 05:40:23.811422	2026-06-10 05:40:23.811422
59	77	Hot Chocholate	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "hot_drinks_and_tea"}	2026-06-10 05:40:24.608448	2026-06-10 05:40:24.608448
60	78	Punet Tea	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "hot_drinks_and_tea"}	2026-06-10 05:40:25.429806	2026-06-10 05:40:25.429806
61	79	Special Tea	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "hot_drinks_and_tea"}	2026-06-10 05:40:26.355219	2026-06-10 05:40:26.355219
62	80	Milk	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "hot_drinks_and_tea"}	2026-06-10 05:40:27.169773	2026-06-10 05:40:27.169773
63	81	Tea With Sprice	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "hot_drinks_and_tea"}	2026-06-10 05:40:28.091138	2026-06-10 05:40:28.091138
64	82	Ginger Tea	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "hot_drinks_and_tea"}	2026-06-10 05:40:28.845051	2026-06-10 05:40:28.845051
65	83	Tea With Lemon	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "hot_drinks_and_tea"}	2026-06-10 05:40:29.630099	2026-06-10 05:40:29.630099
66	84	Meant Mojito	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "mojitos"}	2026-06-10 05:40:30.55491	2026-06-10 05:40:30.55491
67	85	Strobery Mojitos	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "mojitos"}	2026-06-10 05:40:31.474476	2026-06-10 05:40:31.474476
68	86	Blubary Mojitos	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "mojitos"}	2026-06-10 05:40:32.195987	2026-06-10 05:40:32.195987
69	87	Mango Mojitos	1	\N	by_menu_category	t	{"source": "recipe_dataset", "category": "mojitos"}	2026-06-10 05:40:32.815125	2026-06-10 05:40:32.815125
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, display_name, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_locations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_locations (id, name, slug, description, location_type, is_default, is_active, display_order, linked_main_category_slug, meta, version, deleted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_movements (id, inventory_item_id, movement_type, location, location_id, quantity_delta, quantity_after, transfer_id, order_id, order_item_id, notes, created_by, meta, created_at) FROM stdin;
\.


--
-- Data for Name: stock_transfer_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_transfer_items (id, transfer_id, inventory_item_id, quantity, meta, created_at) FROM stdin;
\.


--
-- Data for Name: stock_transfers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_transfers (id, from_location, to_location, from_location_id, to_location_id, status, notes, created_by, received_by, received_at, meta, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sync_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sync_events (id, event_type, entity_type, entity_id, entity_local_id, operation, payload, version, created_at) FROM stdin;
1	MENU_ITEM_DELETED	menu_item	275	\N	delete	{"id": 275}	1	2026-06-05 09:31:44.325936
2	MENU_ITEM_DELETED	menu_item	35	\N	delete	{"id": 35}	1	2026-06-05 09:31:51.075113
3	MENU_ITEM_DELETED	menu_item	34	\N	delete	{"id": 34}	1	2026-06-05 09:31:59.855677
4	MENU_ITEM_DELETED	menu_item	33	\N	delete	{"id": 33}	1	2026-06-05 09:32:12.95594
5	USER_UPDATED	user	4	\N	update	{"id": 4, "meta": {}, "role": "cashier", "phone": null, "role_id": null, "username": "cashier1", "is_active": true, "last_name": "", "first_name": "Cashier", "updated_at": "2026-06-05T09:49:52.795Z"}	1	2026-06-05 09:49:53.216184
6	USER_UPDATED	user	3	\N	update	{"id": 3, "meta": {}, "role": "cafe_waiter", "phone": null, "role_id": null, "username": "waiter1", "is_active": true, "last_name": "", "first_name": "Waiter", "updated_at": "2026-06-05T09:50:06.828Z"}	1	2026-06-05 09:50:07.228177
7	USER_UPDATED	user	3	\N	update	{"id": 3, "meta": {}, "role": "cafe_waiter", "phone": null, "role_id": null, "username": "waiter1", "is_active": true, "last_name": "", "first_name": "Waiter", "updated_at": "2026-06-05T09:50:07.854Z"}	1	2026-06-05 09:50:08.289894
8	USER_DELETED	user	2	\N	delete	{"id": 2}	1	2026-06-05 09:50:13.520884
9	USER_DELETED	user	5	\N	delete	{"id": 5}	1	2026-06-05 09:50:18.744048
10	ORDER_CREATED	order	1	4c91bb9f-b02a-4388-abf8-8becd055b139	create	{"id": 1, "meta": {"localId": "4c91bb9f-b02a-4388-abf8-8becd055b139", "is_printed": 1}, "type": "cafe", "items": [{"id": 1, "name": "Omelette", "menu_id": null, "order_id": 1, "quantity": 1, "subtotal": 0, "item_type": "breakfast", "created_at": "2026-06-05T12:10:36.545Z", "unit_price": 0, "menu_item_id": 2, "main_category": "breakfast", "menu_item_name": "Omelette", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-05T12:09:19.646Z", "updated_at": "2026-06-05T12:10:36.545Z", "customer_id": "820938e8-8ef1-44ca-8607-b16f2ddc7da7", "employee_id": 3, "total_cents": 0, "table_number": 2, "total_amount": 0, "employee_name": "Waiter", "payment_status": "pending"}	1	2026-06-05 12:10:36.594959
11	PAYMENT_METHOD_CREATED	payment_method	1	\N	create	{"id": 1, "icon": "dollar-sign", "name": "cash", "is_active": true, "created_at": "2026-06-05T12:13:16.041Z", "updated_at": "2026-06-05T12:13:16.041Z", "description": null, "display_name": "Cash"}	1	2026-06-05 12:13:16.051151
12	PAYMENT_METHOD_CREATED	payment_method	2	\N	create	{"id": 2, "icon": "smartphone", "name": "mobile", "is_active": true, "created_at": "2026-06-05T12:13:31.176Z", "updated_at": "2026-06-05T12:13:31.176Z", "description": null, "display_name": "Mobile"}	1	2026-06-05 12:13:31.185675
13	PAYMENT_METHOD_CREATED	payment_method	3	\N	create	{"id": 3, "icon": "credit-card", "name": "card", "is_active": true, "created_at": "2026-06-05T12:13:41.830Z", "updated_at": "2026-06-05T12:13:41.830Z", "description": null, "display_name": "Card"}	1	2026-06-05 12:13:41.842514
14	USER_UPDATED	user	1	\N	update	{"id": 1, "meta": {}, "role": "admin", "phone": null, "role_id": null, "username": "admin", "is_active": true, "last_name": "", "first_name": "Administrator", "updated_at": "2026-06-06T04:57:35.732Z"}	1	2026-06-06 04:57:36.157967
15	ORDER_CREATED	order	9	cc950927-bcce-4a7e-8595-75757c0f50f1	create	{"id": 9, "meta": {"localId": "cc950927-bcce-4a7e-8595-75757c0f50f1", "is_printed": 1}, "type": "cafe", "items": [{"id": 10, "name": "Cappuccino", "menu_id": null, "order_id": 9, "quantity": 1, "subtotal": 180, "item_type": "basic-coffee", "created_at": "2026-06-06T09:14:57.703Z", "unit_price": 180, "menu_item_id": 37, "main_category": "basic-coffee", "menu_item_name": "Cappuccino", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:09:15.239Z", "updated_at": "2026-06-06T09:14:57.703Z", "customer_id": "b0ce0270-c80b-41e5-9ac4-ba2a3102b807", "employee_id": 3, "total_cents": 0, "table_number": null, "total_amount": 180, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:14:57.748607
16	ORDER_CREATED	order	10	71cf1a37-7d25-4bc2-835b-63acf9ad98ff	create	{"id": 10, "meta": {"localId": "71cf1a37-7d25-4bc2-835b-63acf9ad98ff", "is_printed": 1}, "type": "cafe", "items": [{"id": 11, "name": "Americano", "menu_id": null, "order_id": 10, "quantity": 1, "subtotal": 160, "item_type": "basic-coffee", "created_at": "2026-06-06T09:22:23.886Z", "unit_price": 160, "menu_item_id": 36, "main_category": "basic-coffee", "menu_item_name": "Americano", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:09:15.585Z", "updated_at": "2026-06-06T09:22:23.886Z", "customer_id": "0e45563c-dcb7-49d3-bb88-e120df4938bd", "employee_id": 3, "total_cents": 0, "table_number": 2, "total_amount": 160, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:22:24.0248
17	ORDER_CREATED	order	11	1dff5278-5d60-4061-9fb1-4bece3ce8459	create	{"id": 11, "meta": {"localId": "1dff5278-5d60-4061-9fb1-4bece3ce8459", "is_printed": 1}, "type": "cafe", "items": [{"id": 12, "name": "Macchiato", "menu_id": null, "order_id": 11, "quantity": 1, "subtotal": 110, "item_type": "basic-coffee", "created_at": "2026-06-06T09:22:23.886Z", "unit_price": 110, "menu_item_id": 38, "main_category": "basic-coffee", "menu_item_name": "Macchiato", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:11:51.573Z", "updated_at": "2026-06-06T09:22:23.886Z", "customer_id": "db8a6f4a-d65b-4faf-b38b-e7b1b112d0c9", "employee_id": 3, "total_cents": 0, "table_number": 2, "total_amount": 110, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:22:24.059731
18	ORDER_CREATED	order	12	c418557d-e528-402d-9b55-20ad8d69a361	create	{"id": 12, "meta": {"localId": "c418557d-e528-402d-9b55-20ad8d69a361", "is_printed": 1}, "type": "cafe", "items": [{"id": 13, "name": "Iced Coffe", "menu_id": null, "order_id": 12, "quantity": 1, "subtotal": 180, "item_type": "cold-coffee", "created_at": "2026-06-06T09:22:23.886Z", "unit_price": 180, "menu_item_id": 41, "main_category": "cold-coffee", "menu_item_name": "Iced Coffe", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:13:17.959Z", "updated_at": "2026-06-06T09:22:23.886Z", "customer_id": "5e840f47-168d-4cb2-b6a1-d160da8ab87b", "employee_id": 3, "total_cents": 0, "table_number": 2, "total_amount": 180, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:22:24.074518
19	ORDER_CREATED	order	13	1719816a-5a15-4840-91d1-2246500c91be	create	{"id": 13, "meta": {"localId": "1719816a-5a15-4840-91d1-2246500c91be", "is_printed": 1}, "type": "cafe", "items": [{"id": 14, "name": "Macchiato", "menu_id": null, "order_id": 13, "quantity": 1, "subtotal": 110, "item_type": "basic-coffee", "created_at": "2026-06-06T09:22:23.886Z", "unit_price": 110, "menu_item_id": 38, "main_category": "basic-coffee", "menu_item_name": "Macchiato", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:14:00.617Z", "updated_at": "2026-06-06T09:22:23.886Z", "customer_id": "92274a0a-6cae-4f1c-8dfd-c45c444e2d8f", "employee_id": 3, "total_cents": 0, "table_number": 2, "total_amount": 110, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:22:24.087591
20	ORDER_CREATED	order	14	f4236e8b-34a8-4085-ba48-5c8860e853dd	create	{"id": 14, "meta": {"localId": "f4236e8b-34a8-4085-ba48-5c8860e853dd", "is_printed": 1}, "type": "cafe", "items": [{"id": 15, "name": "Cinamon Cake", "menu_id": null, "order_id": 14, "quantity": 1, "subtotal": 250, "item_type": "cake-and-snacks", "created_at": "2026-06-06T09:22:23.886Z", "unit_price": 250, "menu_item_id": 54, "main_category": "cake-and-snacks", "menu_item_name": "Cinamon Cake", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:14:58.280Z", "updated_at": "2026-06-06T09:22:23.886Z", "customer_id": "f6eae202-48e5-40bb-a164-76606ae11f54", "employee_id": 3, "total_cents": 0, "table_number": 2, "total_amount": 250, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:22:24.111749
21	ORDER_CREATED	order	15	5aa5d397-7003-498b-838f-efbbbca045b0	create	{"id": 15, "meta": {"localId": "5aa5d397-7003-498b-838f-efbbbca045b0", "is_printed": 1}, "type": "cafe", "items": [{"id": 16, "name": "Iced Coffe", "menu_id": null, "order_id": 15, "quantity": 1, "subtotal": 180, "item_type": "cold-coffee", "created_at": "2026-06-06T09:22:23.886Z", "unit_price": 180, "menu_item_id": 41, "main_category": "cold-coffee", "menu_item_name": "Iced Coffe", "unit_price_cents": null}, {"id": 17, "name": "Boxegna Cake", "menu_id": null, "order_id": 15, "quantity": 1, "subtotal": 85, "item_type": "cake-and-snacks", "created_at": "2026-06-06T09:22:23.886Z", "unit_price": 85, "menu_item_id": 57, "main_category": "cake-and-snacks", "menu_item_name": "Boxegna Cake", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:16:17.749Z", "updated_at": "2026-06-06T09:22:23.886Z", "customer_id": "2e7d7f75-7bb9-486a-82c5-96b0406528a0", "employee_id": 3, "total_cents": 0, "table_number": 2, "total_amount": 265, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:22:24.128318
22	ORDER_CREATED	order	16	f3700e8b-28a6-44cc-838c-73990834f020	create	{"id": 16, "meta": {"localId": "f3700e8b-28a6-44cc-838c-73990834f020", "is_printed": 1}, "type": "cafe", "items": [{"id": 18, "name": "Macchiato", "menu_id": null, "order_id": 16, "quantity": 1, "subtotal": 110, "item_type": "basic-coffee", "created_at": "2026-06-06T09:27:41.372Z", "unit_price": 110, "menu_item_id": 38, "main_category": "basic-coffee", "menu_item_name": "Macchiato", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 3, "cashier_id": null, "created_at": "2026-06-06T09:26:32.237Z", "updated_at": "2026-06-06T09:27:41.372Z", "customer_id": "1f00de47-b680-4339-a098-346db9e83bf7", "employee_id": 3, "total_cents": 0, "table_number": 1, "total_amount": 110, "employee_name": "Waiter", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-06 09:27:41.416483
23	USER_CREATED	user	6	\N	create	{"id": 6, "meta": {}, "role": "cafe_waiter", "phone": null, "role_id": null, "pin_hash": "$2a$10$.cb0BpS4iRHZPpkd.Bi1lO0Uv5Yb1EFIi8ZPiQ.hFzJpBFkN5cHNi", "username": "salhadin", "is_active": true, "last_name": "", "created_at": "2026-06-10T11:16:55.776Z", "first_name": "salhadin", "password_hash": null}	1	2026-06-10 11:16:55.793659
24	USER_CREATED	user	7	\N	create	{"id": 7, "meta": {}, "role": "cafe_waiter", "phone": null, "role_id": null, "pin_hash": "$2a$10$VvRWWUN9FLRFFdeRg0rsOOJc4g2c9xGy..ZJBcmF8Q.eflfya5uMu", "username": "meheret", "is_active": true, "last_name": "", "created_at": "2026-06-10T11:17:32.086Z", "first_name": "meheret", "password_hash": null}	1	2026-06-10 11:17:32.095589
25	USER_DELETED	user	3	\N	delete	{"id": 3}	1	2026-06-10 11:17:41.76897
26	USER_UPDATED	user	4	\N	update	{"id": 4, "meta": {}, "role": "cashier", "phone": null, "role_id": null, "username": "cashier1", "is_active": true, "last_name": "", "first_name": "Cashier", "updated_at": "2026-06-10T11:22:29.631Z"}	1	2026-06-10 11:22:29.642807
27	ORDER_CREATED	order	17	6979a629-310b-42af-9a1a-7131478bd96b	create	{"id": 17, "meta": {"localId": "6979a629-310b-42af-9a1a-7131478bd96b", "is_printed": 1}, "type": "cafe", "items": [{"id": 19, "name": "Cream Chocolate Cake", "menu_id": null, "order_id": 17, "quantity": 2, "subtotal": 180, "item_type": "cakes-and-bakery", "created_at": "2026-06-11T11:22:50.182Z", "unit_price": 90, "menu_item_id": 65, "main_category": "cakes-and-bakery", "menu_item_name": "Cream Chocolate Cake", "unit_price_cents": null}, {"id": 20, "name": "Custerd Crame Cake", "menu_id": null, "order_id": 17, "quantity": 1, "subtotal": 80, "item_type": "cakes-and-bakery", "created_at": "2026-06-11T11:22:50.182Z", "unit_price": 80, "menu_item_id": 64, "main_category": "cakes-and-bakery", "menu_item_name": "Custerd Crame Cake", "unit_price_cents": null}, {"id": 21, "name": "soft drink", "menu_id": null, "order_id": 17, "quantity": 1, "subtotal": 80, "item_type": "mojitos", "created_at": "2026-06-11T11:22:50.182Z", "unit_price": 80, "menu_item_id": 88, "main_category": "mojitos", "menu_item_name": "soft drink", "unit_price_cents": null}], "notes": null, "status": "pending", "waiter_id": 7, "cashier_id": null, "created_at": "2026-06-11T11:18:51.950Z", "updated_at": "2026-06-11T11:22:50.182Z", "customer_id": "9199aec4-f33e-46fc-86d1-f1ca5f63674a", "employee_id": 7, "total_cents": 0, "table_number": 5, "total_amount": 340, "employee_name": "meheret", "payment_status": "pending", "organization_id": null, "is_price_override": false}	1	2026-06-11 11:22:50.228467
\.


--
-- Data for Name: sync_metadata; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sync_metadata (id, source, last_synced_at, last_revision) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (key, value, updated_at) FROM stdin;
allow_low_stock_orders	true	2026-06-06 09:08:52.471
enable_cashier_receipt	true	2026-06-10 11:22:46.845053
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, username, password_hash, pin_hash, role, role_id, first_name, last_name, phone, is_active, print_copies, meta, created_at, updated_at) FROM stdin;
1	System Administrator	admin	$2a$10$iA7LOQWvUG5r1SEWi0qPa.lKLoPKlb2LkHViMiP8lgYYkQJQwks.6	\N	admin	\N	Administrator		\N	t	1	{}	2026-06-05 09:05:13.725054	2026-06-06 04:57:35.732
6	salhadin	salhadin	\N	$2a$10$.cb0BpS4iRHZPpkd.Bi1lO0Uv5Yb1EFIi8ZPiQ.hFzJpBFkN5cHNi	cafe_waiter	\N	salhadin		\N	t	1	{}	2026-06-10 11:16:55.776646	2026-06-10 11:16:55.776646
7	meheret	meheret	\N	$2a$10$VvRWWUN9FLRFFdeRg0rsOOJc4g2c9xGy..ZJBcmF8Q.eflfya5uMu	cafe_waiter	\N	meheret		\N	t	1	{}	2026-06-10 11:17:32.08624	2026-06-10 11:17:32.08624
4	Mike Cashier	cashier1	$2a$10$afW5ge3ZSz1CZOzAVaExpurkXP4lBeqUWDIUTIwY6n9nKIy1HjGXq	$2a$10$ffoEj7VB5CBizt8ilZstVOtlHf50/ECC19I9xBWJYcXTeNXB59z9W	cashier	\N	Cashier		\N	t	1	{}	2026-06-05 09:05:14.956697	2026-06-10 11:22:29.631
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: postgres
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, false);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 35, true);


--
-- Name: dining_tables_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dining_tables_id_seq', 7, true);


--
-- Name: inventory_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_items_id_seq', 133, true);


--
-- Name: inventory_stock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_stock_id_seq', 1, false);


--
-- Name: main_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.main_categories_id_seq', 1, false);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 94, true);


--
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menus_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 21, true);


--
-- Name: order_status_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_status_logs_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 17, true);


--
-- Name: org_credit_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.org_credit_payments_id_seq', 1, false);


--
-- Name: org_credit_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.org_credit_transactions_id_seq', 1, false);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, false);


--
-- Name: payment_methods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payment_methods_id_seq', 3, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payments_id_seq', 18, true);


--
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recipe_ingredients_id_seq', 328, true);


--
-- Name: recipes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.recipes_id_seq', 69, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 1, false);


--
-- Name: stock_locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_locations_id_seq', 1, false);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_movements_id_seq', 1, false);


--
-- Name: stock_transfer_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_transfer_items_id_seq', 1, false);


--
-- Name: stock_transfers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stock_transfers_id_seq', 1, false);


--
-- Name: sync_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sync_events_id_seq', 27, true);


--
-- Name: sync_metadata_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sync_metadata_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: dining_tables dining_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dining_tables
    ADD CONSTRAINT dining_tables_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_stock inventory_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_pkey PRIMARY KEY (id);


--
-- Name: main_categories main_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_categories
    ADD CONSTRAINT main_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_item_categories menu_item_categories_menu_item_id_category_id_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item_categories
    ADD CONSTRAINT menu_item_categories_menu_item_id_category_id_pk PRIMARY KEY (menu_item_id, category_id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_logs order_status_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_logs
    ADD CONSTRAINT order_status_logs_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: org_credit_payments org_credit_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_credit_payments
    ADD CONSTRAINT org_credit_payments_pkey PRIMARY KEY (id);


--
-- Name: org_credit_transactions org_credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_credit_transactions
    ADD CONSTRAINT org_credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_name_unique UNIQUE (name);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: stock_locations stock_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_locations
    ADD CONSTRAINT stock_locations_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_transfer_items stock_transfer_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: sync_events sync_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_events
    ADD CONSTRAINT sync_events_pkey PRIMARY KEY (id);


--
-- Name: sync_metadata sync_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_metadata
    ADD CONSTRAINT sync_metadata_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: categories_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX categories_slug_idx ON public.categories USING btree (slug);


--
-- Name: categories_type_active_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX categories_type_active_order_idx ON public.categories USING btree (type, is_active, display_order);


--
-- Name: dining_tables_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dining_tables_status_idx ON public.dining_tables USING btree (status);


--
-- Name: dining_tables_table_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX dining_tables_table_number_idx ON public.dining_tables USING btree (table_number);


--
-- Name: inventory_stock_item_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX inventory_stock_item_location_idx ON public.inventory_stock USING btree (inventory_item_id, location_id);


--
-- Name: main_categories_active_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX main_categories_active_order_idx ON public.main_categories USING btree (is_active, display_order, name);


--
-- Name: main_categories_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX main_categories_slug_idx ON public.main_categories USING btree (slug);


--
-- Name: menu_item_categories_category_item_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_item_categories_category_item_idx ON public.menu_item_categories USING btree (category_id, menu_item_id);


--
-- Name: menu_item_categories_item_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_item_categories_item_category_idx ON public.menu_item_categories USING btree (menu_item_id, category_id);


--
-- Name: menu_items_available_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_items_available_idx ON public.menu_items USING btree (is_available);


--
-- Name: menu_items_barcode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_items_barcode_idx ON public.menu_items USING btree (barcode);


--
-- Name: menu_items_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_items_name_idx ON public.menu_items USING btree (name);


--
-- Name: menu_items_sku_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX menu_items_sku_idx ON public.menu_items USING btree (sku);


--
-- Name: org_credit_payments_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX org_credit_payments_org_idx ON public.org_credit_payments USING btree (organization_id);


--
-- Name: org_credit_txn_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX org_credit_txn_org_idx ON public.org_credit_transactions USING btree (organization_id);


--
-- Name: org_credit_txn_payment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX org_credit_txn_payment_idx ON public.org_credit_transactions USING btree (payment_id);


--
-- Name: organizations_active_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX organizations_active_name_idx ON public.organizations USING btree (is_active, name);


--
-- Name: payment_methods_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX payment_methods_active_idx ON public.payment_methods USING btree (is_active);


--
-- Name: recipes_menu_item_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX recipes_menu_item_active_idx ON public.recipes USING btree (menu_item_id);


--
-- Name: stock_locations_active_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_locations_active_order_idx ON public.stock_locations USING btree (is_active, display_order, name);


--
-- Name: stock_locations_slug_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX stock_locations_slug_idx ON public.stock_locations USING btree (slug);


--
-- Name: sync_events_cursor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sync_events_cursor_idx ON public.sync_events USING btree (id);


--
-- Name: sync_events_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sync_events_entity_idx ON public.sync_events USING btree (entity_type, entity_id);


--
-- Name: inventory_stock inventory_stock_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: inventory_stock inventory_stock_location_id_stock_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_stock
    ADD CONSTRAINT inventory_stock_location_id_stock_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.stock_locations(id) ON DELETE RESTRICT;


--
-- Name: menu_item_categories menu_item_categories_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item_categories
    ADD CONSTRAINT menu_item_categories_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: menu_item_categories menu_item_categories_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item_categories
    ADD CONSTRAINT menu_item_categories_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_menu_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_id_menu_items_id_fk FOREIGN KEY (menu_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_status_logs order_status_logs_changed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_logs
    ADD CONSTRAINT order_status_logs_changed_by_users_id_fk FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_status_logs order_status_logs_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_status_logs
    ADD CONSTRAINT order_status_logs_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_cashier_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_cashier_id_users_id_fk FOREIGN KEY (cashier_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_employee_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_employee_id_users_id_fk FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: orders orders_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: orders orders_waiter_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_waiter_id_users_id_fk FOREIGN KEY (waiter_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: org_credit_payments org_credit_payments_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_credit_payments
    ADD CONSTRAINT org_credit_payments_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_credit_transactions org_credit_transactions_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_credit_transactions
    ADD CONSTRAINT org_credit_transactions_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: org_credit_transactions org_credit_transactions_payment_id_org_credit_payments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.org_credit_transactions
    ADD CONSTRAINT org_credit_transactions_payment_id_org_credit_payments_id_fk FOREIGN KEY (payment_id) REFERENCES public.org_credit_payments(id) ON DELETE SET NULL;


--
-- Name: payments payments_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: payments payments_processed_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_processed_by_users_id_fk FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: recipe_ingredients recipe_ingredients_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;


--
-- Name: recipe_ingredients recipe_ingredients_recipe_id_recipes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_recipes_id_fk FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- Name: recipes recipes_deduct_from_location_id_stock_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_deduct_from_location_id_stock_locations_id_fk FOREIGN KEY (deduct_from_location_id) REFERENCES public.stock_locations(id) ON DELETE SET NULL;


--
-- Name: recipes recipes_menu_item_id_menu_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_menu_item_id_menu_items_id_fk FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_location_id_stock_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_location_id_stock_locations_id_fk FOREIGN KEY (location_id) REFERENCES public.stock_locations(id) ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: stock_movements stock_movements_order_item_id_order_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_order_item_id_order_items_id_fk FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE SET NULL;


--
-- Name: stock_transfer_items stock_transfer_items_inventory_item_id_inventory_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_inventory_item_id_inventory_items_id_fk FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE CASCADE;


--
-- Name: stock_transfer_items stock_transfer_items_transfer_id_stock_transfers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfer_items
    ADD CONSTRAINT stock_transfer_items_transfer_id_stock_transfers_id_fk FOREIGN KEY (transfer_id) REFERENCES public.stock_transfers(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_transfers stock_transfers_from_location_id_stock_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_from_location_id_stock_locations_id_fk FOREIGN KEY (from_location_id) REFERENCES public.stock_locations(id) ON DELETE RESTRICT;


--
-- Name: stock_transfers stock_transfers_received_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_received_by_users_id_fk FOREIGN KEY (received_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stock_transfers stock_transfers_to_location_id_stock_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_to_location_id_stock_locations_id_fk FOREIGN KEY (to_location_id) REFERENCES public.stock_locations(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict D75uUzMycnxPKdluOpF9oxMxuXquw3gHvLvAaMF4yZebMOmPdqEh2CbYiceEa83

