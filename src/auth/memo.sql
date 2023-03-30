-- Table: public.userBlackList

-- DROP TABLE IF EXISTS public.userBlackList;

CREATE TABLE IF NOT EXISTS public.userBlackList
(
    "userId1" integer NOT NULL,
    "userId2" integer NOT NULL,
    CONSTRAINT user_pkey PRIMARY KEY ("userId1", "userId2"),
    CONSTRAINT fk_userid1_userid1_user_id FOREIGN KEY ("userId1")
        REFERENCES public."User" (id) MATCH SIMPLE
        ON UPDATE RESTRICT
        ON DELETE RESTRICT,
    CONSTRAINT fk_userid1_userid2_user_id FOREIGN KEY ("userId2")
        REFERENCES public."User" (id) MATCH SIMPLE
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.userBlackList
    OWNER to postgres;

COMMENT ON COLUMN public.userBlackList."userId1"
    IS '유저 아이디1';

COMMENT ON COLUMN public.userBlackList."userId2"
    IS '유저 아이디2';