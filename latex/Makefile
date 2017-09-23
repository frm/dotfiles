NAME=main
GREEN=002
BLUE=004

define compile_tex
 	pdflatex -synctex=1 -draftmode -interaction=batchmode -shell-escape $(1).tex ; \
 	biber $(1) ; \
 	pdflatex -synctex=1 -draftmode -interaction=batchmode -shell-escape $(1).tex ; \
 	pdflatex -synctex=1 -interaction=batchmode -shell-escape $(1).tex ; \
	echo ""
endef

define pretty_print
	@printf "\e[38;05;$(1)m[$(2)]: $(3)\e[m\n"
endef

all: $(NAME).pdf

%.pdf: %.tex
	$(call pretty_print,$(BLUE),make,compiling...)
	$(call compile_tex,$(basename $<))
	$(call pretty_print,$(GREEN),make,✓ done!)

clean:
	$(call pretty_print,$(BLUE),make,cleaning up...)
	@echo ""
	@cat ./.make/art/maid.ascii
	@echo "\n"
	$(RM) $(NAME).{acn,glo,ist,run.xml,upa,upb,bcf,aux,bbl,blg,lof,log,synctex.gz,toc,pdf} texput.log
	@echo ""
	$(call pretty_print,$(GREEN),make,✓ done!)

